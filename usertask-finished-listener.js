module.exports = function (RED) {
    function UserTaskFinishedListener(config) {
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

            let subscription = await client.userTasks.onUserTaskFinished(
                (userTaskFinishedNotification) => {
                    node.send({
                        payload: {
                            flowNodeInstanceId: userTaskFinishedNotification.flowNodeInstanceId,
                            userTaskEvent: userTaskFinishedNotification,
                            action: 'finished',
                            type: 'usertask',
                        },
                    });
                },
                { identity: currentIdentity },
            );

            node.engine.registerOnIdentityChanged(async (identity) => {
                client.userTasks.removeSubscription(subscription, currentIdentity);
                currentIdentity = identity;

                subscription = await client.userTasks.onUserTaskFinished(
                    (userTaskFinishedNotification) => {
                        node.send({
                            payload: {
                                flowNodeInstanceId: userTaskFinishedNotification.flowNodeInstanceId,
                                userTaskEvent: userTaskFinishedNotification,
                                action: 'finished',
                                type: 'usertask',
                            },
                        });
                    },
                    { identity: currentIdentity },
                );
            });

            node.on('close', async () => {
                if (node.engine && node.engine.engineClient && client) {
                    client.userTasks.removeSubscription(subscription, currentIdentity);
                }
            });
        };

        if (node.engine) {
            register();
        }
    }
    RED.nodes.registerType('usertask-finished-listener', UserTaskFinishedListener);
};
