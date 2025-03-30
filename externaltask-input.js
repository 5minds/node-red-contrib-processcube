const EventEmitter = require('node:events');

module.exports = function (RED) {

    const os = require('os');

    function ExternalTaskInput(config) {
        RED.nodes.createNode(this, config);
        var node = this;

        node.started_external_tasks = {};

        node.engine = RED.nodes.getNode(config.engine);

        node.eventEmitter = new EventEmitter();

        let options = RED.util.evaluateNodeProperty(config.workerConfig, config.workerConfigType, node);
        let topic = node.topic =  RED.util.evaluateNodeProperty(config.topic, config.topicType, node)
        this.workername = RED.util.evaluateNodeProperty(config.workername, config.workernameType, node);
 
        if (!options['workerId']) {

            if (!this.workername) {
                this.workername = `nodered:${process.env.NODERED_NAME || ''}-host:${os.hostname()}-pid:${process.pid}-id:${node.id}`;
            }

            options['workerId'] = this.workername;
        }

        if (!options['lockDuration'] && process.env.NODE_RED_ETW_LOCK_DURATION) {
            options['lockDuration'] = parseInt(process.env.NODE_RED_ETW_LOCK_DURATION) || undefined;
        }

        if (!options['longpollingTimeout']) {
            options['longpollingTimeout'] = parseInt(process.env.NODE_RED_ETW_LONGPOLLING_TIMEOUT) || undefined;
        }

        if (!options['idleTimeout']) {
            options['idleTimeout'] = parseInt(process.env.NODE_RED_ETW_IDLE_TIMEOUT) || undefined;
        }

        node._subscribed = true;
        node._subscribed_error = null;
        node._trace = '';
        node._step = '';
        node._tracking_nodes = {};
        node._join_inputs = {};
        node._tracking_for_etw = {};

        node.isHandling = () => {
            return Object.keys(node.started_external_tasks).length > 0;
        };

        node.ownMessage = (msg) => {
            return msg.etw_input_node_id === node.id;
        };

        node.clearTracking = (msg) => {
            if (msg.flowNodeInstanceId) {
                node._tracking_for_etw[msg.flowNodeInstanceId].forEach((theNode) => {
                    node.decrMsgOnNode(theNode, msg);
                });
            }
        };

        node.incMsgOnNode = (theNode, msg) => {
            if (node.id === theNode.id) {
                return;
            }

            if (!node._tracking_nodes[theNode.id]) {
                node._tracking_nodes[theNode.id] = {
                    node: theNode,
                    count: 1,
                };
            } else {
                node._tracking_nodes[theNode.id].count++;
            }

            // bei nodes vom type 'join' müssen die eingänge gezählt werden, 
            // dass diese dann wieder beim verlassen am ausgang gesamt entfernt werden müssem
            if (theNode.type === 'join') {
                if (!node._join_inputs[theNode.id]) {
                    node._join_inputs[theNode.id] = {};
                }

                if (!node._join_inputs[theNode.id][msg.flowNodeInstanceId]) {
                    node._join_inputs[theNode.id][msg.flowNodeInstanceId] = 1;
                } else {
                    node._join_inputs[theNode.id][msg.flowNodeInstanceId]++;
                }
            }
            
            if (!node._tracking_for_etw[msg.flowNodeInstanceId]) {
                node._tracking_for_etw[msg.flowNodeInstanceId] = [];
                node._tracking_for_etw[msg.flowNodeInstanceId].push(theNode);
            } else {
                node._tracking_for_etw[msg.flowNodeInstanceId].push(theNode);
            }

            theNode.status({ fill: 'blue', shape: 'dot', text: `tasks(${node._tracking_nodes[theNode.id].count})` });
        };

        node.decrMsgOnNode = (theNode, msg) => {
            if (node.id === theNode.id) {
                return;
            }

            // bei nodes vom type 'join' müssen die eingänge gezählt werden, 
            // dass diese dann wieder beim verlassen am ausgang gesamt entfernt werden müssen
            let dec_count = 1;

            if (theNode.type === 'join') {
                if (!node._join_inputs[theNode.id]) {
                    node._join_inputs[theNode.id] = {};
                }

                if (node._join_inputs[theNode.id][msg.flowNodeInstanceId]) {
                    dec_count = node._join_inputs[theNode.id][msg.flowNodeInstanceId];
                    delete node._join_inputs[theNode.id][msg.flowNodeInstanceId];
                }
            }

            if (!node._tracking_nodes[theNode.id]) {
                node._tracking_nodes[theNode.id] = {
                    node: theNode,
                    count: 0,
                };
            } else {
                //node._tracking_nodes[theNode.id].count--;
                node._tracking_nodes[theNode.id].count =- dec_count;

                if (node._tracking_nodes[theNode.id].count <= 0) {
                    node._tracking_nodes[theNode.id].count = 0;
                }
            }

            if (node._tracking_for_etw[msg.flowNodeInstanceId]) {
                const count_nodes = node._tracking_for_etw[msg.flowNodeInstanceId].filter(item => item !== theNode)

                if (count_nodes <= 0) {
                    delete node._tracking_for_etw[msg.flowNodeInstanceId];
                }
            }

            theNode.status({ fill: 'blue', shape: 'dot', text: `tasks(${node._tracking_nodes[theNode.id].count})` });
        };

        RED.hooks.add('preDeliver', (sendEvent) => {
            if (node.isHandling() && node.ownMessage(sendEvent.msg)) {  
                
                const sourceNode = sendEvent?.source?.node;
                const destinationNode = sendEvent?.destination?.node;

                node._step = `${destinationNode.name || destinationNode.type}`;

                node.showStatus();

                if (process.env.NODE_RED_ETW_STEP_LOGGING == 'true') {
                    node._trace = `'${sourceNode.name || sourceNode.type}'->'${destinationNode.name || destinationNode.type}'`;
                    node.log(`preDeliver: ${node._trace}`);
                }
            }
        });

        RED.hooks.add('postDeliver', (sendEvent) => {
            if (node.isHandling() && node.ownMessage(sendEvent.msg)) {
                const sourceNode = sendEvent?.source?.node;
                const destinationNode = sendEvent?.destination?.node;

                node.decrMsgOnNode(sourceNode, sendEvent.msg);
                node.incMsgOnNode(destinationNode, sendEvent.msg);

                if (process.env.NODE_RED_ETW_STEP_LOGGING == 'true') {
                    node._trace = `'${sourceNode.name || sourceNode.type}'->'${destinationNode.name || destinationNode.type}'`;
                    node.log(`postDeliver: ${node._trace}`);
                }
            }
        });

        node.setSubscribedStatus = () => {
            this._subscribed = true;
            this._subscribed_error = null;
            this.showStatus();
        };

        node.setUnsubscribedStatus = (error) => {
            this._subscribed = false;
            this._subscribed_error = error;

            const info = `subscription failed (topic: ${node.topic}) [error: ${error?.message}].`;
            
            this.error(info);

            this.showStatus();
        };

        node.setStartHandlingTaskStatus = (externalTask) => {
            this._subscribed = true;
            this._subscribed_error = null;
            this.started_external_tasks[externalTask.flowNodeInstanceId] = externalTask;

            this.showStatus();
        };

        node.setFinishHandlingTaskStatus = (externalTask) => {
            if (externalTask.flowNodeInstanceId) {
                delete this.started_external_tasks[externalTask.flowNodeInstanceId];
                node._trace = '';
                node._step = '';
            }

            this._subscribed = true;
            this._subscribed_error = null;

            this.clearTracking(externalTask); // as msg
            this.showStatus();
        };

        node.setErrorFinishHandlingTaskStatus = (externalTask, error) => {
            if (externalTask.flowNodeInstanceId) {
                delete this.started_external_tasks[externalTask.flowNodeInstanceId];
            }

            this._subscribed_error = error;
            this.error(`finished task failed (topic: ${node.topic}).`);

            this.showStatus();
        };

        node.sendStatus = (status, message) => {
            RED.events.emit("processcube:healthcheck:update", {
                nodeId: node.id,
                status: status,
                nodeName: `topic: ${node.topic}`,
                nodeType: 'externaltask-input',
                message: message
            });
        };

        node.showStatus = () => {
            const msgCounter = Object.keys(this.started_external_tasks).length;

            if (this._subscribed === false) {
                this.status({ fill: 'red', shape: 'ring', text: `subscription failed (${msgCounter})` });

                this.sendStatus('NotOk', `subscription failed (${msgCounter})`);
            } else {
                if (msgCounter >= 1) {
                    if (node._step) {
                        this.status({ fill: 'blue', shape: 'dot', text: `tasks(${msgCounter}) ->'${node._step}'` });
                        this.sendStatus('Ok', `tasks(${msgCounter}) ->'${node._step}'.`);
                    } else {
                        this.status({ fill: 'blue', shape: 'dot', text: `tasks(${msgCounter})` });
                        this.sendStatus('Ok', `tasks(${msgCounter})`);
                    }
                    this.log(`handling tasks ${msgCounter}.`);
                } else {
                    this.status({ fill: 'green', shape: 'ring', text: `subcribed` });
                    this.sendStatus('Ok', `subcribed`);
                }               
            }
        };

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
                const saveHandleCallback = (data, callback, msg) => {
                    try {
                        callback(data);
                        node.log(`send to engine *external task flowNodeInstanceId* '${externalTask.flowNodeInstanceId}' and *processInstanceId* ${externalTask.processInstanceId}`);
                        node.setFinishHandlingTaskStatus(externalTask);
                    } catch (error) {
                        node.setErrorFinishHandlingTaskStatus(externalTask, error);
                        msg.error = error;
                        node.error(`failed send to engine *external task flowNodeInstanceId* '${externalTask.flowNodeInstanceId}' and *processInstanceId* ${externalTask.processInstanceId}: ${error?.message}`, msg);
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

                        //resolve(result);
                        saveHandleCallback(result, resolve, msg);
                    };

                    const handleErrorTask = (error) => {
                        node.log(
                            `handle error event for *external task flowNodeInstanceId* '${externalTask.flowNodeInstanceId}' and *processInstanceId* '${externalTask.processInstanceId}' on *msg._msgid* '${error.errorDetails?._msgid}'.`
                        );

                        // TODO: with reject, the default error handling is proceed
                        // SEE: https://github.com/5minds/ProcessCube.Engine.Client.ts/blob/develop/src/ExternalTaskWorker.ts#L180
                        // reject(result);
                        //resolve(msg);
                        saveHandleCallback(error, resolve, error);
                    };

                    node.eventEmitter.once(`handle-${externalTask.flowNodeInstanceId}`, (msg, isError = false) => {
                        node.log(
                            `handle event for *external task flowNodeInstanceId* '${externalTask.flowNodeInstanceId}' and *processInstanceId* '${externalTask.processInstanceId}' with *msg._msgid* '${msg._msgid}' and *isError* '${isError}'`
                        );

                        if (isError) {
                            handleErrorTask(msg);
                        } else {
                            handleFinishTask(msg);
                        }
                    });

                    node.setStartHandlingTaskStatus(externalTask);

                    let msg = {
                        _msgid: RED.util.generateId(),
                        task: RED.util.encodeObject(externalTask),
                        payload: payload,
                        flowNodeInstanceId: externalTask.flowNodeInstanceId,
                        processInstanceId: externalTask.processInstanceId,
                        etw_input_node_id: node.id,
                    };

                    node.log(
                        `Received *external task flowNodeInstanceId* '${externalTask.flowNodeInstanceId}' and *processInstanceId* '${externalTask.processInstanceId}' with *msg._msgid* '${msg._msgid}'`
                    );

                    node.send(msg);
                });
            };

            client.externalTasks
                .subscribeToExternalTaskTopic(topic, etwCallback, options)
                .then(async (externalTaskWorker) => {
                    node.status({ fill: 'blue', shape: 'ring', text: 'subcribed' });

                    node.etw = externalTaskWorker;

                    externalTaskWorker.onHeartbeat((event, external_task_id) => {
                        node.setSubscribedStatus();
                        
                        if (process.env.NODE_RED_ETW_HEARTBEAT_LOGGING  == 'true') {
                            if (external_task_id) {
                                this.log(`subscription (heartbeat:topic ${node.topic}, ${event} for ${external_task_id}).`);
                            } else {
                                this.log(`subscription (heartbeat:topic ${node.topic}, ${event}).`);
                            }
                        }    
                    });

                    externalTaskWorker.onWorkerError((errorType, error, externalTask) => {
                        switch (errorType) {
                            case 'extendLock':
                            case 'finishExternalTask':
                            case 'processExternalTask':
                                node.error(
                                    `Worker error ${errorType} for *external task flowNodeInstanceId* '${externalTask.flowNodeInstanceId}' and *processInstanceId* '${externalTask.processInstanceId}': ${error?.message}`
                                );

                                node.setUnsubscribedStatus(error);

                                if (process.env.NODE_RED_ETW_STOP_IF_FAILED == 'true') { 
                                    // abort the external task MM: waiting for a fix in the client.ts
                                    externalTaskWorker.abortExternalTaskIfPresent(externalTask.id);
                                    // mark the external task as finished, cause it is gone
                                    node.setFinishHandlingTaskStatus(externalTask);
                                    node.log(`Cancel external task flowNodeInstanceId* '${externalTask.flowNodeInstanceId}' and *processInstanceId* '${externalTask.processInstanceId}'.`)
                                }

                                break;
                            case 'fetchAndLock':
                                node.setUnsubscribedStatus(error);
                                break;
                            default:
                                // reduce noise error logs
                                break;
                        }
                    });

                    try {
                        externalTaskWorker.start();
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
