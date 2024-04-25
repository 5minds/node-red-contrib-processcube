const process = require('process');

const engine_client = require('@5minds/processcube_engine_client');
const EventAggregator = require('./EventAggregator');

const engineUrl = process.env.ENGINE_URL || 'http://engine:8000';

const client = new engine_client.EngineClient(engineUrl);

function showStatus(node, msgCounter) {
    if (msgCounter >= 1) {
        node.status({fill: "blue", shape: "dot", text: `handling tasks ${msgCounter}`});
    } else {
        node.status({fill: "blue", shape: "ring", text: `subcribed ${msgCounter}`});
    }
}

module.exports = function(RED) {
    function ExternalTaskInput(config) {
        RED.nodes.createNode(this,config);
        var node = this;
        var msgCounter = 0;

        client.externalTasks.subscribeToExternalTaskTopic(
            config.topic,
            async (payload, externalTask) => {
                msgCounter++;

                return await new Promise((resolve, reject) => {
                    
                    EventAggregator.eventEmitter.once(`finish-${externalTask.flowNodeInstanceId}`, (result) => {
                        msgCounter--;
                        showStatus(node, msgCounter);
                        resolve(result);
                    });

                    EventAggregator.eventEmitter.once(`error-${externalTask.flowNodeInstanceId}`, (msg) => {
                        msgCounter--;
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
            }
        );
    }
    RED.nodes.registerType("externaltask-input", ExternalTaskInput);
}