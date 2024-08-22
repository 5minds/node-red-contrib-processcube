module.exports = function (RED) {
    function ProcessFinishedListener(config) {
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

            if (node.engine.isIdentityReady()) {
                subscription = await client.notification.onProcessEnded(
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
            }

            node.engine.registerOnIdentityChanged(async (identity) => {
                if (subscription) {
                    client.notification.removeSubscription(subscription, currentIdentity);
                }

                currentIdentity = identity;

                subscription = await client.notification.onProcessEnded(
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
    RED.nodes.registerType('process-finished-listener', ProcessFinishedListener);
};
