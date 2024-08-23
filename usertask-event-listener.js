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

            async function subscribe() {
                switch (config.eventtype) {
                    case 'new':
                        return await client.userTasks.onUserTaskWaiting(
                            (userTaskNotification) => {
                                if (config.usertask != '' && config.usertask != userTaskNotification.flowNodeId) return;
                                node.send({
                                    payload: {
                                        flowNodeInstanceId: userTaskNotification.flowNodeInstanceId,
                                        userTaskEvent: userTaskNotification,
                                        action: 'new',
                                        type: 'usertask',
                                    },
                                });
                            },
                            { identity: currentIdentity }
                        );
                    case 'finished':
                        return await client.userTasks.onUserTaskFinished(
                            (userTaskNotification) => {
                                if (config.usertask != '' && config.usertask != userTaskNotification.flowNodeId) return;
                                node.send({
                                    payload: {
                                        flowNodeInstanceId: userTaskNotification.flowNodeInstanceId,
                                        userTaskEvent: userTaskNotification,
                                        action: 'finished',
                                        type: 'usertask',
                                    },
                                });
                            },
                            { identity: currentIdentity }
                        );
                    case 'reserved':
                        return await client.userTasks.onUserTaskReserved(
                            (userTaskNotification) => {
                                if (config.usertask != '' && config.usertask != userTaskNotification.flowNodeId) return;
                                node.send({
                                    payload: {
                                        flowNodeInstanceId: userTaskNotification.flowNodeInstanceId,
                                        userTaskEvent: userTaskNotification,
                                        action: 'reserved',
                                        type: 'usertask',
                                    },
                                });
                            },
                            { identity: currentIdentity }
                        );
                    case 'reservation-canceled':
                        return await client.userTasks.onUserTaskReservationCanceled(
                            (userTaskNotification) => {
                                if (config.usertask != '' && config.usertask != userTaskNotification.flowNodeId) return;
                                node.send({
                                    payload: {
                                        flowNodeInstanceId: userTaskNotification.flowNodeInstanceId,
                                        userTaskEvent: userTaskNotification,
                                        action: 'reservation-canceled',
                                        type: 'usertask',
                                    },
                                });
                            },
                            { identity: currentIdentity }
                        );
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
