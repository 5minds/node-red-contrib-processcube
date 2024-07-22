const EventEmitter = require('node:events');

function showStatus(node, msgCounter) {
    if (msgCounter >= 1) {
        node.status({fill: "blue", shape: "dot", text: `handling tasks ${msgCounter}.`});
    } else {
        node.status({fill: "blue", shape: "ring", text: `subcribed.`});
    }
}

const started_external_tasks = {};

module.exports = function(RED) {
    function ExternalTaskInput(config) {
        RED.nodes.createNode(this,config);
        var node = this;
        var flowContext = node.context().flow;
      
        this.engine = this.server = RED.nodes.getNode(config.engine);

        const client = this.engine.getEngineClient();

        var eventEmitter = flowContext.get('emitter');

        if (!eventEmitter) {
            flowContext.set('emitter', new EventEmitter());
            eventEmitter = flowContext.get('emitter');
        }

        client.externalTasks.subscribeToExternalTaskTopic(
            config.topic,
            async (payload, externalTask) => {
                
                return await new Promise((resolve, reject) => {

                    const handleFinishTask = (msg) => {
                        let result = RED.util.encodeObject(msg.payload);

                        node.log(`handle event for external task ${externalTask.flowNodeInstanceId} and process it with result ${result} on msg._msgid ${msg._msgid}.`);

                        if (externalTask.flowNodeInstanceId) {
                            delete started_external_tasks[externalTask.flowNodeInstanceId];
                        }

                        showStatus(node, Object.keys(started_external_tasks).length);


                        resolve(result);
                    };

                    const handleErrorTask = (msg) => {

                        node.log(`handle error event for external task ${externalTask.flowNodeInstanceId} with result ${msg} on msg._msgid ${msg._msgid}.`);

                        if (externalTask.flowNodeInstanceId) {
                            delete started_external_tasks[externalTask.flowNodeInstanceId];
                        }

                        showStatus(node, Object.keys(started_external_tasks).length);


                        // TODO: with reject, the default error handling is proceed 
                        // SEE: https://github.com/5minds/ProcessCube.Engine.Client.ts/blob/develop/src/ExternalTaskWorker.ts#L180
                        // reject(result);
                        resolve(msg);
                    };

                    eventEmitter.once(`handle-${externalTask.flowNodeInstanceId}`, (msg, isError = false) => {
                        node.log(`handle event for external task ${externalTask.flowNodeInstanceId} and process it with msg._msgid ${msg._msgid} and isError ${isError}`);

                        if (isError) {
                            handleErrorTask(msg);
                        } else {
                            handleFinishTask(msg);
                        }
                    });

                    started_external_tasks[externalTask.flowNodeInstanceId] = externalTask;

                    showStatus(node, Object.keys(started_external_tasks).length);

                    let msg = {
                        _msgid: RED.util.generateId(),
                        topic: externalTask.topic,
                        payload: payload,
                        externalTaskId: externalTask.flowNodeInstanceId
                    };
                    
                    node.log(`Received external task ${externalTask.flowNodeInstanceId} and process it with msg._msgid ${msg._msgid}`);
                    
                    node.send(msg);
                });
            },
            ).then(async externalTaskWorker => {
                node.status({fill: "blue", shape: "ring", text: "subcribed"});

                externalTaskWorker.identity = node.server.identity;
                node.server.registerOnIdentityChanged((identity) => {
                    externalTaskWorker.identity = identity;
                }); 

                // export type WorkerErrorHandler = (errorType: 'fetchAndLock' | 'extendLock' | 'processExternalTask' | 'finishExternalTask', error: Error, externalTask?: ExternalTask<any>) => void;
                externalTaskWorker.onWorkerError((errorType, error, externalTask) => {
                    switch (errorType) {
                        case 'extendLock':
                        case 'finishExternalTask':
                        case 'processExternalTask':
                            node.error(`Worker error ${errorType} for external task ${externalTask.flowNodeInstanceId}: ${error.message}`);
                    
                            externalTaskWorker.stop();

                            if (externalTask) {
                                delete started_external_tasks[externalTask.flowNodeInstanceId];
                            }

                            showStatus(node, Object.keys(started_external_tasks).length);
                            break;
                        default:
                            node.error(`Worker error ${errorType}: ${error.message}`);
                            break;
                    }
                });

                externalTaskWorker.start();

                node.on("close", () => {
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