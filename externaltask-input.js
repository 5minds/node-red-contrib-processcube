const process = require('process');
const EventEmitter = require('node:events');

const engine_client = require('@5minds/processcube_engine_client');

function showStatus(node, msgCounter) {
    if (msgCounter >= 1) {
        node.status({fill: "blue", shape: "dot", text: `handling tasks ${msgCounter}`});
    } else {
        node.status({fill: "blue", shape: "ring", text: `subcribed ${msgCounter}`});
    }
}

function decrCounter(msgCounter) {
    msgCounter--;

    if (msgCounter < 0) {
        msgCounter = 0;
    }

    return msgCounter;
}

module.exports = function(RED) {
    function ExternalTaskInput(config) {
        RED.nodes.createNode(this,config);
        var node = this;
        var msgCounter = 0;
        var flowContext = node.context().flow;
        var nodeContext = node.context();

        this.engine = this.server = RED.nodes.getNode(config.engine);

        const engineUrl = this.engine?.url || process.env.ENGINE_URL || 'http://engine:8000';

        var client = nodeContext.get('client');

        if (!client) {
            nodeContext.set('client', new engine_client.EngineClient(engineUrl));
            client = nodeContext.get('client');
        }   

        var eventEmitter = flowContext.get('emitter');

        if (!eventEmitter) {
            flowContext.set('emitter', new EventEmitter());
            eventEmitter = flowContext.get('emitter');
        }

        client.externalTasks.subscribeToExternalTaskTopic(
            config.topic,
            async (payload, externalTask) => {
                msgCounter++;

                return await new Promise((resolve, reject) => {
                    
                    // TODO: once ist 2x gebunden
                    eventEmitter.once(`finish-${externalTask.flowNodeInstanceId}`, (result) => {
                        msgCounter = decrCounter(msgCounter);

                        showStatus(node, msgCounter);
                        resolve(result);
                    });

                    eventEmitter.once(`error-${externalTask.flowNodeInstanceId}`, (msg) => {
                        msgCounter = decrCounter(msgCounter);
                        showStatus(node, msgCounter);

                        var result = msg.payload ? msg.payload : msg;

                        reject(result);
                    });

                    showStatus(node, msgCounter);
                    node.send({ topic: externalTask.topic, externalTaskId: externalTask.flowNodeInstanceId, payload: payload});
                });
            },
            ).then(externalTaskWorker => {
                node.status({fill: "blue", shape: "ring", text: "subcribed"});
                externalTaskWorker.start();

                node.on("close", async () => {
                    try {
                        externalTaskWorker.stop();
                    } catch {
                        console.warn('Client close failed');
                    }
                });
            }
        );
    }
    RED.nodes.registerType("externaltask-input", ExternalTaskInput);
}