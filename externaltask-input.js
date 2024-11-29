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

        const engine = RED.nodes.getNode(config.engine);

        var eventEmitter = flowContext.get('emitter');

        if (!eventEmitter) {
            flowContext.set('emitter', new EventEmitter());
            eventEmitter = flowContext.get('emitter');
        }

        const engineEventEmitter = engine.eventEmitter;

        node.log(`got event emmiter: ${JSON.stringify(engineEventEmitter)}`);

        engineEventEmitter.on('engine-client-dispose', () => {
            node.log('rm subsctiption');
            engine.engineClient.externalTasks.removeSubscription(subscription, engine.identity);
            node.log('done rm subscriptions');
        });

        engineEventEmitter.on('engine-client-changed', () => {
            node.log('new engineClient received');
            register();
        });

        const register = async () => {
            node.log('registering node');
            const client = engine.engineClient;
            node.log(`subscribing to client: ${JSON.stringify(engine.engineClient)}`);

            if (!client) {
                node.error('No engine configured.');
                return;
            }
            const etwCallback = async (payload, externalTask) => {
                const saveHandleCallback = (data, callback) => {
                    try {
                        callback(data);
                    } catch (error) {
                        node.error(`Error in callback 'saveHandleCallback': ${error.message}`);
                    }
                };

                return await new Promise((resolve, reject) => {
                    const handleFinishTask = (msg) => {
                        let result = RED.util.encodeObject(msg.payload);

                        node.log(
                            `handle event for *external task flowNodeInstanceId* '${externalTask.flowNodeInstanceId}' and *processInstanceId* ${externalTask.processInstanceId} with result ${result} on msg._msgid ${msg._msgid}.`
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

            let options = RED.util.evaluateNodeProperty(config.workerConfig, 'json', node);

            client.externalTasks
                .subscribeToExternalTaskTopic(config.topic, etwCallback, options)
                .then(async (externalTaskWorker) => {
                    node.status({ fill: 'blue', shape: 'ring', text: 'subcribed' });

                    externalTaskWorker.identity = engine.identity;
                    engine.registerOnIdentityChanged((identity) => {
                        externalTaskWorker.identity = identity;
                    });

                    // export type WorkerErrorHandler = (errorType: 'fetchAndLock' | 'extendLock' | 'processExternalTask' | 'finishExternalTask', error: Error, externalTask?: ExternalTask<any>) => void;
                    externalTaskWorker.onWorkerError((errorType, error, externalTask) => {
                        switch (errorType) {
                            case 'extendLock':
                            case 'finishExternalTask':
                            case 'processExternalTask':
                                node.error(
                                    `Worker error ${errorType} for *external task flowNodeInstanceId* '${externalTask.flowNodeInstanceId}' and *processInstanceId* '${externalTask.processInstanceId}': ${error.message}`
                                );

                                if (externalTask) {
                                    delete started_external_tasks[externalTask.flowNodeInstanceId];
                                }

                                showStatus(node, Object.keys(started_external_tasks).length);
                                break;
                            case 'fetchAndLock':
                                node.status({});
                                node.error(`Worker error ${errorType}: ${error.message}`);
                                break;
                            default:
                                // reduce noise error logs
                                // node.error(`Worker error ${errorType}: ${error.message}`);
                                break;
                        }
                    });

                    try {
                        externalTaskWorker.start();
                    } catch (error) {
                        node.error(`Worker start 'externalTaskWorker.start' failed: ${error.message}`);
                    }

                    node.on('close', () => {
                        try {
                            externalTaskWorker.stop();
                        } catch {
                            node.error('Client close failed');
                        }
                    });
                })
                .catch((error) => {
                    node.error(`Error in subscribeToExternalTaskTopic: ${error.message}`);
                });
        };

        if (engine) {
            node.log(`initial register: ${engine}`);
            register();
        }
    }

    RED.nodes.registerType('externaltask-input', ExternalTaskInput);
};
