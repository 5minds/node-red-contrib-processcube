module.exports = function (RED) {
    function ProcessNewListener(config) {
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
                subscription = await client.notification.onProcessStarted(
                    (processNotification) => {
                        if (config.processmodel != processNotification.processModelId) return;
                        node.send({
                            payload: {
                                processInstanceId: processNotification.processInstanceId,
                                flowNodeId: processNotification.flowNodeId,
                                token: processNotification.currentToken,
                                action: 'started',
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

                subscription = await client.notification.onProcessStarted(
                    (processNotification) => {
                        if (config.processmodel != processNotification.processModelId) return;
                        node.send({
                            payload: {
                                processInstanceId: processNotification.processInstanceId,
                                flowNodeId: processNotification.flowNodeId,
                                token: processNotification.currentToken,
                                action: 'started',
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
    RED.nodes.registerType('process-new-listener', ProcessNewListener);
};
