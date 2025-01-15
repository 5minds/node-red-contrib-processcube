module.exports = function (RED) {
    function ProcessEventListener(config) {
        RED.nodes.createNode(this, config);
        var node = this;
        node.engine = RED.nodes.getNode(config.engine);

        let subscription;

        const register = async () => {
            const client = node.engine.engineClient;

            if (!client) {
                node.error('No engine configured.');
                return;
            }

            const query = RED.util.evaluateNodeProperty(config.query, config.query_type, node);

            async function subscribe(eventType) {
                switch (eventType) {
                    case 'starting':
                        return await client.notification.onProcessStarting(async (processNotification) => {
                            if (
                                config.processmodel != '' &&
                                config.processmodel != processNotification.processModelId
                            ) {
                                return;
                            }

                            const newQuery = {
                                processInstanceId: processNotification.processInstanceId,
                                ...query,
                            };

                            try {
                                const matchingInstances = await client.processInstances.query(newQuery);

                                if (
                                    matchingInstances.processInstances &&
                                    matchingInstances.processInstances.length == 1
                                ) {
                                    const processInstance = matchingInstances.processInstances[0];
                                    node.send({
                                        payload: {
                                            processInstanceId: processNotification.processInstanceId,
                                            processModelId: processNotification.processModelId,
                                            processInstance: processInstance,
                                            action: 'starting',
                                            type: 'processInstance',
                                        },
                                    });
                                }
                            } catch (error) {
                                node.error(error);
                            }
                            
                        });
                    case 'started':
                        return await client.notification.onProcessStarted(async (processNotification) => {
                            if (
                                config.processmodel != '' &&
                                config.processmodel != processNotification.processModelId
                            ) {
                                return;
                            }

                            const newQuery = {
                                processInstanceId: processNotification.processInstanceId,
                                ...query,
                            };

                            try {
                                const matchingInstances = await client.processInstances.query(newQuery);

                                if (
                                    matchingInstances.processInstances &&
                                    matchingInstances.processInstances.length == 1
                                ) {
                                    const processInstance = matchingInstances.processInstances[0];
                                    node.send({
                                        payload: {
                                            processInstanceId: processNotification.processInstanceId,
                                            processModelId: processNotification.processModelId,
                                            flowNodeId: processNotification.flowNodeId,
                                            token: processNotification.currentToken,
                                            processInstance: processInstance,
                                            action: 'started',
                                            type: 'processInstance',
                                        },
                                    });
                                }
                            } catch (error) {
                                node.error(error);
                            }
                        });
                    case 'resumed':
                        return await client.notification.onProcessResumed(async (processNotification) => {
                            if (config.processmodel != '' && config.processmodel != processNotification.processModelId)
                                return;

                            const newQuery = {
                                processInstanceId: processNotification.processInstanceId,
                                ...query,
                            };

                            try {
                                const matchingInstances = await client.processInstances.query(newQuery);

                                if (
                                    matchingInstances.processInstances &&
                                    matchingInstances.processInstances.length == 1
                                ) {
                                    const processInstance = matchingInstances.processInstances[0];
                                    node.send({
                                        payload: {
                                            processInstanceId: processNotification.processInstanceId,
                                            processModelId: processNotification.processModelId,
                                            token: processNotification.currentToken,
                                            processInstance: processInstance,
                                            action: 'resumed',
                                            type: 'processInstance',
                                        },
                                    });
                                }
                            } catch (error) {
                                node.error(error);
                            }
                        });
                    case 'finished':
                        return await client.notification.onProcessEnded(async (processNotification) => {
                            if (config.processmodel != '' && config.processmodel != processNotification.processModelId)
                                return;

                            const newQuery = {
                                processInstanceId: processNotification.processInstanceId,
                                ...query,
                            };

                            try {
                                const matchingInstances = await client.processInstances.query(newQuery);

                                if (
                                    matchingInstances.processInstances &&
                                    matchingInstances.processInstances.length == 1
                                ) {
                                    const processInstance = matchingInstances.processInstances[0];
                                    node.send({
                                        payload: {
                                            processInstanceId: processNotification.processInstanceId,
                                            processModelId: processNotification.processModelId,
                                            flowNodeId: processNotification.flowNodeId,
                                            token: processNotification.currentToken,
                                            processInstance: processInstance,
                                            action: 'finished',
                                            type: 'processInstance',
                                        },
                                    });
                                }
                            } catch (error) {
                                node.error(error);
                            }
                        });
                    case 'terminated':
                        return await client.notification.onProcessTerminated(async (processNotification) => {
                            if (config.processmodel != '' && config.processmodel != processNotification.processModelId)
                                return;

                            const newQuery = {
                                processInstanceId: processNotification.processInstanceId,
                                ...query,
                            };

                            try {
                                const matchingInstances = await client.processInstances.query(newQuery);
                                if (
                                    matchingInstances.processInstances &&
                                    matchingInstances.processInstances.length == 1
                                ) {
                                    const processInstance = matchingInstances.processInstances[0];
                                    node.send({
                                        payload: {
                                            processInstanceId: processNotification.processInstanceId,
                                            processModelId: processNotification.processModelId,
                                            token: processNotification.currentToken,
                                            processInstance: processInstance,
                                            action: 'terminated',
                                            type: 'processInstance',
                                        },
                                    });
                                }
                            } catch (error) {
                                node.error(error);
                            }
                        });
                    case 'error':
                        return await client.notification.onProcessError(async (processNotification) => {
                            if (config.processmodel != '' && config.processmodel != processNotification.processModelId)
                                return;

                            const newQuery = {
                                processInstanceId: processNotification.processInstanceId,
                                ...query,
                            };

                            try {
                                const matchingInstances = await client.processInstances.query(newQuery);

                                if (
                                    matchingInstances.processInstances &&
                                    matchingInstances.processInstances.length == 1
                                ) {
                                    const processInstance = matchingInstances.processInstances[0];
                                    node.send({
                                        payload: {
                                            processInstanceId: processNotification.processInstanceId,
                                            processModelId: processNotification.processModelId,
                                            token: processNotification.currentToken,
                                            processInstance: processInstance,
                                            action: 'error',
                                            type: 'processInstance',
                                        },
                                    });
                                }
                            } catch (error) {
                                node.error(error);
                            }
                        });
                    case 'owner-changed':
                        return await client.notification.onProcessOwnerChanged(async (processNotification) => {
                            if (config.processmodel != '' && config.processmodel != processNotification.processModelId)
                                return;

                            const newQuery = {
                                processInstanceId: processNotification.processInstanceId,
                                ...query,
                            };

                            try {
                                const matchingInstances = await client.processInstances.query(newQuery);

                                if (
                                    matchingInstances.processInstances &&
                                    matchingInstances.processInstances.length == 1
                                ) {
                                    const processInstance = matchingInstances.processInstances[0];
                                    node.send({
                                        payload: {
                                            processInstanceId: processNotification.processInstanceId,
                                            processModelId: processNotification.processModelId,
                                            processInstance: processInstance,
                                            action: 'owner-changed',
                                            type: 'processInstance',
                                        },
                                    });
                                }
                            } catch (error) {
                                node.error(error);
                            }
                        });
                    case 'instances-deleted':
                        return await client.notification.onProcessInstancesDeleted(async (processNotification) => {
                            if (config.processmodel != '' && config.processmodel != processNotification.processModelId)
                                return;

                            const newQuery = {
                                processInstanceId: processNotification.processInstanceId,
                                ...query,
                            };

                            try {
                                const matchingInstances = await client.processInstances.query(newQuery);

                                if (
                                    matchingInstances.processInstances &&
                                    matchingInstances.processInstances.length == 1
                                ) {
                                    const processInstance = matchingInstances.processInstances[0];
                                    node.send({
                                        payload: {
                                            processInstanceId: processNotification.processInstanceId,
                                            processModelId: processNotification.processModelId,
                                            processInstance: processInstance,
                                            action: 'instances-deleted',
                                            type: 'processInstance',
                                        },
                                    });
                                }
                            } catch (error) {
                                node.error(error);
                            }
                        });
                    case 'is-executable-changed':
                        return await client.notification.onProcessIsExecutableChanged((processNotification) => {
                            node.log(
                                'processNotification (is-executable-changed): ' + JSON.stringify(processNotification)
                            );

                            if (config.processmodel != '' && config.processmodel != processNotification.processModelId)
                                return;
                            node.send({
                                payload: {
                                    processModelId: processNotification.processModelId,
                                    action: 'is-executable-changed',
                                    type: 'processModel',
                                },
                            });
                        });
                    case 'deployed':
                        return await client.notification.onProcessDeployed((processNotification) => {
                            node.log('processNotification (deployed): ' + JSON.stringify(processNotification));

                            if (config.processmodel != '' && config.processmodel != processNotification.processModelId)
                                return;
                            node.send({
                                payload: {
                                    processModelId: processNotification.processModelId,
                                    action: 'deployed',
                                    type: 'processModel',
                                },
                            });
                        });
                    case 'undeployed':
                        return await client.notification.onProcessUndeployed((processNotification) => {
                            node.log('processNotification (undeployed): ' + JSON.stringify(processNotification));

                            if (config.processmodel != '' && config.processmodel != processNotification.processModelId)
                                return;
                            node.send({
                                payload: {
                                    processModelId: processNotification.processModelId,
                                    action: 'undeployed',
                                    type: 'processModel',
                                },
                            });
                        });
                    default:
                        console.error('no such event: ' + eventType);
                        break;
                }
            }

            subscription = await subscribe(config.eventtype);

            node.on('close', () => {
                if (node.engine && node.engine.engineClient && client) {
                    client.notification.removeSubscription(subscription);
                }
            });
        };

        if (node.engine) {
            register();
        }
    }
    RED.nodes.registerType('process-event-listener', ProcessEventListener);
};
