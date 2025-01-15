module.exports = function (RED) {
    function UserTaskEventListener(config) {
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

            const query = RED.util.evaluateNodeProperty(config.query, config.query_type, node);

            function userTaskCallback() {
                return async (userTaskNotification) => {
                    if (config.usertask != '' && config.usertask != userTaskNotification.flowNodeId) return;

                    const newQuery = {
                        flowNodeInstanceId: userTaskNotification.flowNodeInstanceId,
                        ...query,
                    };

                    try {
                        const matchingFlowNodes = await client.userTasks.query(newQuery);

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
                    } catch (error) {
                        node.error(error);
                    }
                };
            }

            async function subscribe() {
                switch (config.eventtype) {
                    case 'new':
                        return await client.userTasks.onUserTaskWaiting(userTaskCallback());
                    case 'finished':
                        return await client.userTasks.onUserTaskFinished(userTaskCallback());
                    case 'reserved':
                        return await client.userTasks.onUserTaskReserved(userTaskCallback());
                    case 'reservation-canceled':
                        return await client.userTasks.onUserTaskReservationCanceled(userTaskCallback());
                    default:
                        console.error('no such event: ' + config.eventtype);
                }
            }

            subscription = subscribe();

            node.on('close', async () => {
                if (node.engine && node.engine.engineClient && client) {
                    client.userTasks.removeSubscription(subscription);
                }
            });
        };

        if (node.engine) {
            register();
        }
    }
    RED.nodes.registerType('usertask-event-listener', UserTaskEventListener);
};
