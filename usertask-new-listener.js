module.exports = function (RED) {
    function UserTaskNewListener(config) {
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
                subscription = await client.userTasks.onUserTaskWaiting(
                    (userTaskWaitingNotification) => {
                        node.send({
                            payload: {
                                flowNodeInstanceId: userTaskWaitingNotification.flowNodeInstanceId,
                                userTaskEvent: userTaskWaitingNotification,
                                action: 'new',  
                                type: 'usertask',
                            },
                        });
                    },
                    { identity: currentIdentity },
                );
            }

            node.engine.registerOnIdentityChanged(async (identity) => {
                if (subscription) {
                    client.userTasks.removeSubscription(subscription, currentIdentity);
                }

                currentIdentity = identity;

                subscription = await client.userTasks.onUserTaskWaiting(
                    (userTaskWaitingNotification) => {
                        node.send({
                            payload: {
                                flowNodeInstanceId: userTaskWaitingNotification.flowNodeInstanceId,
                                userTaskEvent: userTaskWaitingNotification,
                                action: 'new',
                                type: 'usertask',
                            },
                        });
                    },
                    { identity: currentIdentity },
                );
            });

            node.on('close', () => {
                if (node.engine && node.engine.engineClient && client) {
                    client.userTasks.removeSubscription(subscription, currentIdentity);
                }
            });
        };

        if (node.engine) {
            register();
        }
    }
    RED.nodes.registerType('usertask-new-listener', UserTaskNewListener);
};
