module.exports = function (RED) {
    function WaitForUsertask(config) {
        RED.nodes.createNode(this, config);
        var node = this;

        node.engine = RED.nodes.getNode(config.engine);

        let subscription = null;
        let subscribe = null;

        node.on('input', async function (msg) {
            const client = node.engine.engineClient;
            subscribe = async () => {
                if (!client) {
                    node.error('No engine configured.');
                    return;
                }

                const query = RED.util.evaluateNodeProperty(config.query, config.query_type, node, msg);

                subscription = await client.userTasks.onUserTaskWaiting(async (userTaskWaitingNotification) => {
                    const newQuery = {
                        flowNodeInstanceId: userTaskWaitingNotification.flowNodeInstanceId,
                        ...query,
                    };

                    try {
                        const matchingFlowNodes = await client.userTasks.query(newQuery);

                        if (matchingFlowNodes.userTasks && matchingFlowNodes.userTasks.length == 1) {
                            // remove subscription
                            client.userTasks.removeSubscription(subscription);

                            const userTask = matchingFlowNodes.userTasks[0];

                            msg.payload = { userTask: userTask };
                            node.send(msg);
                        } else {
                            // nothing todo - wait for next notification
                        }
                    } catch (error) {
                        node.error(JSON.stringify(error));
                    }
                });

                node.log({ 'Handling old userTasks config.only_for_new': config.only_for_new });

                if (config.only_for_new === false) {
                    // only check suspended user tasks
                    const suspendedQuery = {
                        state: 'suspended',
                        ...query,
                    };

                    try {
                        const matchingFlowNodes = await client.userTasks.query(suspendedQuery);

                        if (matchingFlowNodes.userTasks && matchingFlowNodes.userTasks.length >= 1) {
                            const userTask = matchingFlowNodes.userTasks[0];

                            msg.payload = { userTask: userTask };
                            node.send(msg);

                            // remove subscription
                            client.userTasks.removeSubscription(subscription);
                        } else {
                            // let the *currentIdentity* be active
                        }
                    } catch (error) {
                        node.error(JSON.stringify(error));
                    }
                }
            };

            subscribe();
        });

        node.on('close', async () => {
            if (client != null && subscription != null) {
                client.userTasks.removeSubscription(subscription);
            }
        });
    }
    RED.nodes.registerType('wait-for-usertask', WaitForUsertask);
};
