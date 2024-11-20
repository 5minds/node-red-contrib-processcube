module.exports = function (RED) {
    function ProcessEventListener(config) {
        RED.nodes.createNode(this, config);
        var node = this;
        node.engine = RED.nodes.getNode(config.engine);

        const eventEmitter = node.engine.eventEmitter;

        eventEmitter.on('engine-client-changed', () => {
            node.log('new engineClient received');
            register();
        });

        const register = async () => {
            const client = node.engine.engineClient;

            if (!client) {
                node.error('No engine configured.');
                return;
            }

            let currentIdentity = node.engine.identity;

            let subscription;
            const query = RED.util.evaluateNodeProperty(config.query, config.query_type, node);

            async function subscribe(eventType) {
                switch (eventType) {
                    case 'starting':
                        return await client.notification.onProcessStarting(
                            async (processNotification) => {
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
                                    const matchingInstances = await client.processInstances.query(newQuery, {
                                        identity: currentIdentity,
                                    });

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
                            },
                            { identity: currentIdentity }
                        );
                    case 'started':
                        return await client.notification.onProcessStarted(
                            async (processNotification) => {
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
                                    const matchingInstances = await client.processInstances.query(newQuery, {
                                        identity: currentIdentity,
                                    });

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
                            },
                            { identity: currentIdentity }
                        );
                    case 'resumed':
                        return await client.notification.onProcessResumed(
                            async (processNotification) => {
                                if (
                                    config.processmodel != '' &&
                                    config.processmodel != processNotification.processModelId
                                )
                                    return;

                                const newQuery = {
                                    processInstanceId: processNotification.processInstanceId,
                                    ...query,
                                };

                                try {
                                    const matchingInstances = await client.processInstances.query(newQuery, {
                                        identity: currentIdentity,
                                    });

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
                            },
                            { identity: currentIdentity }
                        );
                    case 'finished':
                        return await client.notification.onProcessEnded(
                            async (processNotification) => {
                                if (
                                    config.processmodel != '' &&
                                    config.processmodel != processNotification.processModelId
                                )
                                    return;

                                const newQuery = {
                                    processInstanceId: processNotification.processInstanceId,
                                    ...query,
                                };

                                try {
                                    const matchingInstances = await client.processInstances.query(newQuery, {
                                        identity: currentIdentity,
                                    });

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
                            },
                            { identity: currentIdentity }
                        );
                    case 'terminated':
                        return await client.notification.onProcessTerminated(
                            async (processNotification) => {
                                if (
                                    config.processmodel != '' &&
                                    config.processmodel != processNotification.processModelId
                                )
                                    return;

                                const newQuery = {
                                    processInstanceId: processNotification.processInstanceId,
                                    ...query,
                                };

                                try {
                                    const matchingInstances = await client.processInstances.query(newQuery, {
                                        identity: currentIdentity,
                                    });
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
                            },
                            { identity: currentIdentity }
                        );
                    case 'error':
                        return await client.notification.onProcessError(
                            async (processNotification) => {
                                if (
                                    config.processmodel != '' &&
                                    config.processmodel != processNotification.processModelId
                                )
                                    return;

                                const newQuery = {
                                    processInstanceId: processNotification.processInstanceId,
                                    ...query,
                                };

                                try {
                                    const matchingInstances = await client.processInstances.query(newQuery, {
                                        identity: currentIdentity,
                                    });

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
                            },
                            { identity: currentIdentity }
                        );
                    case 'owner-changed':
                        return await client.notification.onProcessOwnerChanged(
                            async (processNotification) => {
                                if (
                                    config.processmodel != '' &&
                                    config.processmodel != processNotification.processModelId
                                )
                                    return;

                                const newQuery = {
                                    processInstanceId: processNotification.processInstanceId,
                                    ...query,
                                };

                                try {
                                    const matchingInstances = await client.processInstances.query(newQuery, {
                                        identity: currentIdentity,
                                    });

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
                            },
                            { identity: currentIdentity }
                        );
                    case 'instances-deleted':
                        return await client.notification.onProcessInstancesDeleted(
                            async (processNotification) => {
                                if (
                                    config.processmodel != '' &&
                                    config.processmodel != processNotification.processModelId
                                )
                                    return;

                                const newQuery = {
                                    processInstanceId: processNotification.processInstanceId,
                                    ...query,
                                };

                                try {
                                    const matchingInstances = await client.processInstances.query(newQuery, {
                                        identity: currentIdentity,
                                    });

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
                            },
                            { identity: currentIdentity }
                        );
                    case 'is-executable-changed':
                        return await client.notification.onProcessIsExecutableChanged(
                            (processNotification) => {
                                if (
                                    config.processmodel != '' &&
                                    config.processmodel != processNotification.processModelId
                                )
                                    return;
                                node.send({
                                    payload: {
                                        processModelId: processNotification.processModelId,
                                        action: 'is-executable-changed',
                                        type: 'processModel',
                                    },
                                });
                            },
                            { identity: currentIdentity }
                        );
                    case 'deployed':
                        return await client.notification.onProcessDeployed(
                            (processNotification) => {
                                if (
                                    config.processmodel != '' &&
                                    config.processmodel != processNotification.processModelId
                                )
                                    return;
                                node.send({
                                    payload: {
                                        processModelId: processNotification.processModelId,
                                        action: 'deployed',
                                        type: 'processModel',
                                    },
                                });
                            },
                            { identity: currentIdentity }
                        );
                    case 'undeployed':
                        return await client.notification.onProcessUndeployed(
                            (processNotification) => {
                                if (
                                    config.processmodel != '' &&
                                    config.processmodel != processNotification.processModelId
                                )
                                    return;
                                node.send({
                                    payload: {
                                        processModelId: processNotification.processModelId,
                                        action: 'undeployed',
                                        type: 'processModel',
                                    },
                                });
                            },
                            { identity: currentIdentity }
                        );
                    default:
                        console.error('no such event: ' + eventType);
                        break;
                }
            }

            if (node.engine.isIdentityReady()) {
                subscription = await subscribe(config.eventtype);
            }

            node.engine.registerOnIdentityChanged(async (identity) => {
                if (subscription) {
                    client.notification.removeSubscription(subscription, currentIdentity);
                }

                currentIdentity = identity;

                subscription = await client.notification.onProcessResumed(
                    (processNotification) => {
                        if (config.processmodel != '' && config.processmodel != processNotification.processModelId)
                            return;
                        node.send({
                            payload: {
                                processInstanceId: processNotification.processInstanceId,
                                processModelId: processNotification.processModelId,
                                token: processNotification.currentToken,
                                action: 'resumed',
                                type: 'processInstance',
                            },
                        });
                    },
                    { identity: currentIdentity }
                );
            });

            node.on('close', () => {
                if (node.engine && node.engine.engineClient && client) {
                    client.notification.removeSubscription(subscription, currentIdentity);
                }
            });
        };

        if (node.engine) {
            register();
        }
    }
    RED.nodes.registerType('process-event-listener', ProcessEventListener);
};
