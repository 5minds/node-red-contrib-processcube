const process = require('process');

const engine_client = require('@5minds/processcube_engine_client');
const { userInfo } = require('os');

module.exports = function (RED) {
    function WaitForUsertask(config) {
        RED.nodes.createNode(this, config);
        var node = this;
        var nodeContext = node.context();

        this.engine = this.server = RED.nodes.getNode(config.engine);

        const engineUrl = this.engine?.url || process.env.ENGINE_URL || 'http://engine:8000';

        var client = nodeContext.get('client');

        if (!client) {
            nodeContext.set('client', new engine_client.EngineClient(engineUrl));
            client = nodeContext.get('client');
        }

        node.on("close", async () => {
            if (client != null) {
                client.dispose();
                client = null;
            }
        });

        node.on('input', async function (msg) {

            const query = RED.util.evaluateNodeProperty(config.query, config.query_type, node, msg)

            const sub = await client.userTasks.onUserTaskWaiting(async (userTaskWaitingNotification) => {

                const newQuery = {
                    'flowNodeInstanceId': userTaskWaitingNotification.flowNodeInstanceId,
                    ...query
                };

                const matchingFlowNodes = await client.userTasks.query(newQuery);

                if (matchingFlowNodes.userTasks && matchingFlowNodes.userTasks.length == 1) {
                    const userTask = matchingFlowNodes.userTasks[0];

                    msg.payload = { userTask: userTask };
                    node.send(msg);
                } else {
                }

                // remove subscription
                client.userTasks.removeSubscription(sub);
            });

            console.debug('Handling old userTasks config.only_for_new', config.only_for_new);

            if (config.only_for_new === false) {
                // only check suspended user tasks
                const suspendedQuery = {
                    'state': 'suspended',
                    ...query
                };

                const matchingFlowNodes = await client.userTasks.query(suspendedQuery);

                if (matchingFlowNodes.userTasks && matchingFlowNodes.userTasks.length >= 1) {
                    const userTask = matchingFlowNodes.userTasks[0];

                    msg.payload = { userTask: userTask };
                    node.send(msg);

                    // remove subscription
                    client.userTasks.removeSubscription(sub);
                } else {
                    // let the *sub* be active

                }
            }
        });
    }
    RED.nodes.registerType("wait-for-usertask", WaitForUsertask);
}