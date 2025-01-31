module.exports = function (RED) {
    function WaitForUsertask(config) {
        RED.nodes.createNode(this, config);
        var node = this;

        node.engine = RED.nodes.getNode(config.engine);

        let subscription = null;
        let subscribe = null;

        node.on('input', async function (msg) {
            const client = node.engine.engineClient;
            const isUser = !!msg._client?.user;
            const userIdentity = isUser ? { userId: msg._client.user.id, token: msg._client.user.accessToken } : null;
            subscribe = async () => {
                if (!client) {
                    node.error('No engine configured.', msg);
                    return;
                }

                const query = RED.util.evaluateNodeProperty(config.query, config.query_type, node, msg);

                subscription = await client.userTasks.onUserTaskWaiting(
                    async (userTaskWaitingNotification) => {
                        const newQuery = {
                            flowNodeInstanceId: userTaskWaitingNotification.flowNodeInstanceId,
                            ...query,
                        };

                        try {
                            const matchingFlowNodes = await client.userTasks.query(newQuery, {
                                identity: userIdentity,
                            });

                            if (matchingFlowNodes.userTasks && matchingFlowNodes.userTasks.length == 1) {
                                // remove subscription
                                client.userTasks.removeSubscription(subscription, userIdentity);

                                const userTask = matchingFlowNodes.userTasks[0];

                                msg.payload = { userTask: userTask };
                                node.send(msg);
                            } else {
                                // nothing todo - wait for next notification
                            }
                        } catch (error) {
                            node.error(error, msg);
                        }
                    },
                    {
                        identity: userIdentity,
                    },
                );

                node.log({ 'Handling old userTasks config.only_for_new': config.only_for_new });

                if (config.only_for_new === false) {
                    // only check suspended user tasks
                    const suspendedQuery = {
                        state: 'suspended',
                        ...query,
                    };

                    try {
                        const matchingFlowNodes = await client.userTasks.query(suspendedQuery, {
                            identity: userIdentity,
                        });

                        if (matchingFlowNodes.userTasks && matchingFlowNodes.userTasks.length >= 1) {
                            const userTask = matchingFlowNodes.userTasks[0];

                            msg.payload = { userTask: userTask };
                            node.send(msg);

                            // remove subscription
                            client.userTasks.removeSubscription(subscription, userIdentity);
                        } else {
                            // let the *currentIdentity* be active
                        }
                    } catch (error) {
                        node.error(error, msg);
                    }
                }
            };

            await subscribe();
        });

        node.on('close', () => {
            if (client != null && subscription != null) {
                client.userTasks.removeSubscription(subscription);
            }
        });
    }
    RED.nodes.registerType('wait-for-usertask', WaitForUsertask);
};
