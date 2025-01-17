const EventEmitter = require('node:events');

function showStatus(node, msgCounter) {
    if (msgCounter >= 1) {
        node.status({ fill: 'blue', shape: 'dot', text: `handling tasks ${msgCounter}.` });
    } else {
        node.status({ fill: 'blue', shape: 'ring', text: `subcribed.` });
    }
}

const started_external_tasks = {};

module.exports = function (RED) {
    function ExternalTaskInput(config) {
        RED.nodes.createNode(this, config);
        var node = this;
        var flowContext = node.context().flow;

        node.engine = RED.nodes.getNode(config.engine);

        var eventEmitter = flowContext.get('emitter');

        if (!eventEmitter) {
            flowContext.set('emitter', new EventEmitter());
            eventEmitter = flowContext.get('emitter');
        }

        const register = async () => {
            if (node.etw) {
                try {
                    node.etw.stop();
                    node.log(`old etw closed: ${JSON.stringify(node.etw)}`);
                } catch (e) {
                    node.log(`cant close etw: ${JSON.stringify(node.etw)}`);
                }
            }
            const client = node.engine.engineClient;

            if (!client) {
                node.error('No engine configured.', {});
                return;
            }
            const etwCallback = async (payload, externalTask) => {
                const saveHandleCallback = (data, callback) => {
                    try {
                        callback(data);
                    } catch (error) {
                        node.error(`Error in callback 'saveHandleCallback': ${error.message}`, {});
                    }
                };

                return await new Promise((resolve, reject) => {
                    const handleFinishTask = (msg) => {
                        let result = RED.util.encodeObject(msg.payload);

                        // remote msg and format from result
                        delete result.format;
                        delete result.msg;

                        node.log(
                            `handle event for *external task flowNodeInstanceId* '${externalTask.flowNodeInstanceId}' and *processInstanceId* ${externalTask.processInstanceId} with result ${JSON.stringify(result)} on msg._msgid ${msg._msgid}.`
                        );

                        if (externalTask.flowNodeInstanceId) {
                            delete started_external_tasks[externalTask.flowNodeInstanceId];
                        }

                        showStatus(node, Object.keys(started_external_tasks).length);

                        //resolve(result);
                        saveHandleCallback(result, resolve);
                    };

                    const handleErrorTask = (msg) => {
                        node.log(
                            `handle error event for *external task flowNodeInstanceId* '${externalTask.flowNodeInstanceId}' and *processInstanceId* '${externalTask.processInstanceId}' on *msg._msgid* '${msg._msgid}'.`
                        );

                        if (externalTask.flowNodeInstanceId) {
                            delete started_external_tasks[externalTask.flowNodeInstanceId];
                        }

                        showStatus(node, Object.keys(started_external_tasks).length);

                        // TODO: with reject, the default error handling is proceed
                        // SEE: https://github.com/5minds/ProcessCube.Engine.Client.ts/blob/develop/src/ExternalTaskWorker.ts#L180
                        // reject(result);
                        //resolve(msg);
                        saveHandleCallback(msg, resolve);
                    };

                    eventEmitter.once(`handle-${externalTask.flowNodeInstanceId}`, (msg, isError = false) => {
                        node.log(
                            `handle event for *external task flowNodeInstanceId* '${externalTask.flowNodeInstanceId}' and *processInstanceId* '${externalTask.processInstanceId}' with *msg._msgid* '${msg._msgid}' and *isError* '${isError}'`
                        );

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
                        task: RED.util.encodeObject(externalTask),
                        payload: payload,
                        flowNodeInstanceId: externalTask.flowNodeInstanceId,
                        processInstanceId: externalTask.processInstanceId,
                    };

                    node.log(
                        `Received *external task flowNodeInstanceId* '${externalTask.flowNodeInstanceId}' and *processInstanceId* '${externalTask.processInstanceId}' with *msg._msgid* '${msg._msgid}'`
                    );

                    node.send(msg);
                });
            };

            let options = RED.util.evaluateNodeProperty(config.workerConfig, config.workerConfigType, node);
            let topic =  RED.util.evaluateNodeProperty(config.topic, config.topicType, node)

            client.externalTasks
                .subscribeToExternalTaskTopic(topic, etwCallback, options)
                .then(async (externalTaskWorker) => {
                    node.status({ fill: 'blue', shape: 'ring', text: 'subcribed' });

                    node.etw = externalTaskWorker;

                    // export type WorkerErrorHandler = (errorType: 'fetchAndLock' | 'extendLock' | 'processExternalTask' | 'finishExternalTask', error: Error, externalTask?: ExternalTask<any>) => void;
                    externalTaskWorker.onWorkerError((errorType, error, externalTask) => {
                        switch (errorType) {
                            case 'extendLock':
                            case 'finishExternalTask':
                            case 'processExternalTask':
                                node.error(
                                    `Worker error ${errorType} for *external task flowNodeInstanceId* '${externalTask.flowNodeInstanceId}' and *processInstanceId* '${externalTask.processInstanceId}': ${error.message}`,
                                    {}
                                );

                                if (externalTask) {
                                    delete started_external_tasks[externalTask.flowNodeInstanceId];
                                }

                                showStatus(node, Object.keys(started_external_tasks).length);
                                break;
                            case 'fetchAndLock':
                                node.status({});
                                node.error(`Worker error ${errorType}: ${error.message}`, {});
                                break;
                            default:
                                // reduce noise error logs
                                break;
                        }
                    });

                    try {
                        externalTaskWorker.start();
                        showStatus(node, Object.keys(started_external_tasks).length);
                    } catch (error) {
                        node.error(`Worker start 'externalTaskWorker.start' failed: ${error.message}`, {});
                    }

                    node.on('close', () => {
                        try {
                            externalTaskWorker.stop();
                        } catch {
                            node.error('Client close failed', {});
                        }
                    });
                })
                .catch((error) => {
                    node.error(`Error in subscribeToExternalTaskTopic: ${error.message}`, {});
                });
        };

        if (node.engine) {
            register().catch((error) => {
                node.error(error, {});
            });
        }
    }

    RED.nodes.registerType('externaltask-input', ExternalTaskInput);
};
