module.exports = function (RED) {
    function WaitForUsertask(config) {
        RED.nodes.createNode(this, config);
        var node = this;

        const engine = RED.nodes.getNode(config.engine);

        const client = engine.engineClient;

        let subscription = null;
        let currentIdentity = engine.identity;
        let subscribe = null;

        node.on('input', async function (msg) {
            subscribe = async () => {
                if (!client) {
                    node.error('No engine configured.');
                    return;
                }

                const query = RED.util.evaluateNodeProperty(config.query, config.query_type, node, msg);

                subscription = await client.userTasks.onUserTaskWaiting(async (userTaskWaitingNotification) => {

                    const newQuery = {
                        'flowNodeInstanceId': userTaskWaitingNotification.flowNodeInstanceId,
                        ...query
                    };

                    const matchingFlowNodes = await client.userTasks.query(newQuery, { identity: currentIdentity });

                    if (matchingFlowNodes.userTasks && matchingFlowNodes.userTasks.length == 1) {
                        const userTask = matchingFlowNodes.userTasks[0];

                        msg.payload = { userTask: userTask };
                        node.send(msg);
                    } else {
                        // nothing todo - wait for next notification
                    }

                    // remove subscription
                    client.userTasks.removeSubscription(subscription, currentIdentity);
                }, { identity: currentIdentity });

                node.log({"Handling old userTasks config.only_for_new": config.only_for_new});

                if (config.only_for_new === false) {
                    // only check suspended user tasks
                    const suspendedQuery = {
                        'state': 'suspended',
                        ...query
                    };

                    const matchingFlowNodes = await client.userTasks.query(suspendedQuery, { identity: currentIdentity });

                    if (matchingFlowNodes.userTasks && matchingFlowNodes.userTasks.length >= 1) {
                        const userTask = matchingFlowNodes.userTasks[0];

                        msg.payload = { userTask: userTask };
                        node.send(msg);

                        // remove subscription
                        client.userTasks.removeSubscription(subscription, currentIdentity);
                    } else {
                        // let the *currentIdentity* be active
                    }
                }
            };

            subscribe();
        });

        node.engine.registerOnIdentityChanged(async (identity) => {

            if (subscription) {
                client.userTasks.removeSubscription(subscription, currentIdentity);
                currentIdentity = identity;
                subscribe();
            } else {
                currentIdentity = identity;
            }
        });

        node.on("close", async () => {
            if (client != null && subscription != null) {
                client.userTasks.removeSubscription(subscription, currentIdentity);                
            }
        });
    }
    RED.nodes.registerType("wait-for-usertask", WaitForUsertask);
}