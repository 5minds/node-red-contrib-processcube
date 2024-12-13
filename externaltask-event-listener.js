module.exports = function (RED) {
    function ExternalTaskEventListener(config) {
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

            function externalTaskCallback() {
                return (externalTaskNotification) => {
                    if (config.externaltask != '' && config.externaltask != externalTaskNotification.flowNodeId) return;
                    node.send({
                        payload: {
                            flowNodeInstanceId: externalTaskNotification.flowNodeInstanceId,
                            externalTaskEvent: externalTaskNotification,
                            action: config.eventtype,
                            type: 'externaltask',
                        },
                    });
                };
            }

            async function subscribe() {
                switch (config.eventtype) {
                    case 'created':
                        return await client.notification.onExternalTaskCreated(externalTaskCallback());
                    case 'locked':
                        return await client.notification.onExternalTaskLocked(externalTaskCallback());
                    case 'unlocked':
                        return await client.notification.onExternalTaskUnlocked(externalTaskCallback());
                    default:
                        console.error('no such event: ' + config.eventtype);
                }
            }

            subscription = subscribe();

            node.on('close', async () => {
                if (node.engine && node.engine.engineClient && client) {
                    client.notification.removeSubscription(subscription);
                }
            });
        };

        if (node.engine) {
            register();
        }
    }
    RED.nodes.registerType('externaltask-event-listener', ExternalTaskEventListener);
};
