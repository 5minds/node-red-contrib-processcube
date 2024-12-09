module.exports = function (RED) {
    function EndEventFinishedListener(config) {
        RED.nodes.createNode(this, config);
        var node = this;
        node.engine = RED.nodes.getNode(config.engine);

        let subscription = null;

        const eventEmitter = node.engine.eventEmitter;

        eventEmitter.on('engine-client-dispose', () => {
            node.engine.engineClient.events.removeSubscription(subscription, node.engine.identity);
        });

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

            try {
                subscription = await client.events.onEndEventFinished(
                    (endEventFinished) => {
                        node.send({
                            payload: endEventFinished,
                        });
                    },
                    { identity: currentIdentity }
                );

                node.engine.registerOnIdentityChanged(async (identity) => {
                    client.events.removeSubscription(subscription, currentIdentity);

                    currentIdentity = identity;

                    subscription = await client.events.onEndEventFinished(
                        (endEventFinished) => {
                            node.send({
                                payload: endEventFinished,
                            });
                        },
                        { identity: currentIdentity }
                    );
                });
            } catch (error) {
                node.error(error);
            }

            node.on('close', async () => {
                if (node.engine && node.engine.engineClient && client) {
                    client.events.removeSubscription(subscription, currentIdentity);
                }
            });
        };

        if (node.engine) {
            register();
        }
    }
    RED.nodes.registerType('endevent-finished-listener', EndEventFinishedListener);
};
