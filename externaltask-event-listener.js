module.exports = function (RED) {
    function ExternalTaskEventListener(config) {
        RED.nodes.createNode(this, config);
        var node = this;
        node.engine = RED.nodes.getNode(config.engine);

        const register = async () => {
            let currentIdentity = node.engine.identity;

            const client = node.engine.engineClient;

            if (!client) {
                node.error('No engine configured.');
                return;
            }

            let subscription;

            function externalTaskCallback(event) {
                return (externalTaskNotification) => {
                    if (config.externaltask != '' && config.externaltask != externalTaskNotification.flowNodeId) return;
                    node.send({
                        payload: {
                            flowNodeInstanceId: externalTaskNotification.flowNodeInstanceId,
                            externalTaskEvent: externalTaskNotification,
                            action: event,
                            type: 'externaltask',
                        },
                    });
                };
            }

            async function subscribe() {
                switch (config.eventtype) {
                    case 'created':
                        return await client.notification.onExternalTaskCreated(externalTaskCallback('created'), {
                            identity: currentIdentity,
                        });
                    case 'locked':
                        return await client.notification.onExternalTaskLocked(externalTaskCallback('locked'), {
                            identity: currentIdentity,
                        });
                    case 'unlocked':
                        return await client.notification.onExternalTaskUnlocked(externalTaskCallback('unlocked'), {
                            identity: currentIdentity,
                        });
                    default:
                        console.error('no such event: ' + config.eventtype);
                }
            }

            if (node.engine.isIdentityReady()) {
                subscription = subscribe();
            }

            node.engine.registerOnIdentityChanged(async (identity) => {
                if (subscription) {
                    client.notification.removeSubscription(subscription, currentIdentity);
                }
                currentIdentity = identity;

                subscription = subscribe();
            });

            node.on('close', async () => {
                if (node.engine && node.engine.engineClient && client) {
                    client.notification.removeSubscription(subscription, currentIdentity);
                }
            });
        };

        if (node.engine) {
            register();
        }
    }
    RED.nodes.registerType('externaltask-event-listener', ExternalTaskEventListener);
};
