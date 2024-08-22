module.exports = function (RED) {
    function ProcessEventListener(config) {
        RED.nodes.createNode(this, config);
        var node = this;
        node.engine = RED.nodes.getNode(config.engine);

        const register = async () => {
            const client = node.engine.engineClient;

            if (!client) {
                node.error('No engine configured.');
                return;
            }

            let currentIdentity = node.engine.identity;

            let subscription;

            async function subscribe(eventType) {
                switch (eventType) {
                    case "starting":
                        return await client.notification.onProcessStarting(
                            (processNotification) => {
                                if (config.processmodel != '' && config.processmodel != processNotification.processModelId)
                                    return;
                                node.send({
                                    payload: {
                                        processInstanceId: processNotification.processInstanceId,
                                        processModelId: processNotification.processModelId,
                                        action: 'starting',
                                        type: 'processInstance',
                                    },
                                });
                            },
                            { identity: currentIdentity }
                        );
                    case 'started':
                        return await client.notification.onProcessStarted(
                            (processNotification) => {
                                if (config.processmodel != '' && config.processmodel != processNotification.processModelId)
                                    return;
                                node.send({
                                    payload: {
                                        processInstanceId: processNotification.processInstanceId,
                                        processModelId: processNotification.processModelId,
                                        flowNodeId: processNotification.flowNodeId,
                                        token: processNotification.currentToken,
                                        action: 'started',
                                        type: 'processInstance',
                                    },
                                });
                            },
                            { identity: currentIdentity }
                        );
                    case 'resumed':
                        return await client.notification.onProcessResumed(
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
                    case 'finished':
                        return await client.notification.onProcessEnded(
                            (processNotification) => {
                                if (config.processmodel != '' && config.processmodel != processNotification.processModelId)
                                    return;
                                node.send({
                                    payload: {
                                        processInstanceId: processNotification.processInstanceId,
                                        processModelId: processNotification.processModelId,
                                        flowNodeId: processNotification.flowNodeId,
                                        token: processNotification.currentToken,
                                        action: 'finished',
                                        type: 'processInstance',
                                    },
                                });
                            },
                            { identity: currentIdentity }
                        );
                    case 'terminated':
                        return await client.notification.onProcessTerminated(
                            (processNotification) => {
                                if (config.processmodel != '' && config.processmodel != processNotification.processModelId)
                                    return;
                                node.send({
                                    payload: {
                                        processInstanceId: processNotification.processInstanceId,
                                        processModelId: processNotification.processModelId,
                                        token: processNotification.currentToken,
                                        action: 'terminated',
                                        type: 'processInstance',
                                    },
                                });
                            },
                            { identity: currentIdentity }
                        );
                    case "error":
                        return await client.notification.onProcessError(
                            (processNotification) => {
                                if (config.processmodel != '' && config.processmodel != processNotification.processModelId)
                                    return;
                                node.send({
                                    payload: {
                                        processInstanceId: processNotification.processInstanceId,
                                        processModelId: processNotification.processModelId,
                                        token: processNotification.currentToken,
                                        action: 'error',
                                        type: 'processInstance',
                                    },
                                });
                            },
                            { identity: currentIdentity }
                        );
                    case "owner-changed":
                        return await client.notification.onProcessOwnerChanged(
                            (processNotification) => {
                                if (config.processmodel != '' && config.processmodel != processNotification.processModelId)
                                    return;
                                node.send({
                                    payload: {
                                        processInstanceId: processNotification.processInstanceId,
                                        processModelId: processNotification.processModelId,
                                        action: 'owner-changed',
                                        type: 'processInstance',
                                    },
                                });
                            },
                            { identity: currentIdentity }
                        );
                    case "instances-deleted":
                        return await client.notification.onProcessInstancesDeleted(
                            (processNotification) => {
                                if (config.processmodel != '' && config.processmodel != processNotification.processModelId)
                                    return;
                                node.send({
                                    payload: {
                                        processInstanceId: processNotification.processInstanceId,
                                        processModelId: processNotification.processModelId,
                                        action: 'instances-deleted',
                                        type: 'processInstance',
                                    },
                                });
                            },
                            { identity: currentIdentity }
                        );
                    case "is-executable-changed":
                        return await client.notification.onProcessIsExecutableChanged(
                            (processNotification) => {
                                if (config.processmodel != '' && config.processmodel != processNotification.processModelId)
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
                    case "deployed":
                        return await client.notification.onProcessDeployed(
                            (processNotification) => {
                                if (config.processmodel != '' && config.processmodel != processNotification.processModelId)
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
                    case "undeployed":
                        return await client.notification.onProcessUndeployed(
                            (processNotification) => {
                                if (config.processmodel != '' && config.processmodel != processNotification.processModelId)
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
                        console.error("no such event: " + eventType)
                        break;
                }
            }

            if (node.engine.isIdentityReady()) {
                subscription = await subscribe(config.eventtype)
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
