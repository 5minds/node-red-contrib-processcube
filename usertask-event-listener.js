module.exports = function (RED) {
    function UserTaskEventListener(config) {
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
            const query = RED.util.evaluateNodeProperty(config.query, config.query_type, node);

            function userTaskCallback() {
                return async (userTaskNotification) => {
                    if (config.usertask != '' && config.usertask != userTaskNotification.flowNodeId) return;
                    const newQuery = {
                        flowNodeInstanceId: userTaskNotification.flowNodeInstanceId,
                        ...query,
                    };

                    const matchingFlowNodes = await client.userTasks.query(newQuery, {
                        identity: currentIdentity,
                    });

                    if (matchingFlowNodes.userTasks && matchingFlowNodes.userTasks.length == 1) {
                        const userTask = matchingFlowNodes.userTasks[0];

                        node.send({
                            payload: {
                                flowNodeInstanceId: userTaskNotification.flowNodeInstanceId,
                                userTaskEvent: userTaskNotification,
                                userTask: userTask,
                                action: config.eventtype,
                                type: 'usertask',
                            },
                        });
                    }
                };
            }

            async function subscribe() {
                switch (config.eventtype) {
                    case 'new':
                        return await client.userTasks.onUserTaskWaiting(userTaskCallback(), {
                            identity: currentIdentity,
                        });
                    case 'finished':
                        return await client.userTasks.onUserTaskFinished(userTaskCallback(), {
                            identity: currentIdentity,
                        });
                    case 'reserved':
                        return await client.userTasks.onUserTaskReserved(userTaskCallback(), {
                            identity: currentIdentity,
                        });
                    case 'reservation-canceled':
                        return await client.userTasks.onUserTaskReservationCanceled(userTaskCallback(), {
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
                    client.userTasks.removeSubscription(subscription, currentIdentity);
                }
                currentIdentity = identity;

                subscription = subscribe();
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
    RED.nodes.registerType('usertask-event-listener', UserTaskEventListener);
};
