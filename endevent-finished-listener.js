module.exports = function (RED) {
    function EndEventFinishedListener(config) {
        RED.nodes.createNode(this, config);
        var node = this;
        node.engine = RED.nodes.getNode(config.engine);

        let subscription = null;

        const register = async () => {
            const client = node.engine.engineClient;

            if (!client) {
                node.error('No engine configured.', {});
                return;
            }

            try {
                subscription = await client.events.onEndEventFinished((endEventFinished) => {
                    node.send({
                        payload: endEventFinished,
                    });
                });
            } catch (error) {
                node.error(error, {});
            }

            node.on('close', async () => {
                if (node.engine && node.engine.engineClient && client) {
                    client.events.removeSubscription(subscription);
                }
            });
        };

        if (node.engine) {
            register().catch((error) => {
                node.error(error, {});
            });
        }
    }
    RED.nodes.registerType('endevent-finished-listener', EndEventFinishedListener);
};
