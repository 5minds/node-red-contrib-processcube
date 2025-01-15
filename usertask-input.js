module.exports = function (RED) {
    function UserTaskInput(config) {
        RED.nodes.createNode(this, config);
        var node = this;

        node.on('input', function (msg) {
            node.engine = RED.nodes.getNode(config.engine);

            const client = node.engine.engineClient;

            if (!client) {
                node.error('No engine configured.');
                return;
            }

            let query = RED.util.evaluateNodeProperty(config.query, config.query_type, node, msg);

            client.userTasks
                .query(query)
                .then((matchingFlowNodes) => {
                    if (config.sendtype === 'array') {
                        msg.payload = { userTasks: matchingFlowNodes.userTasks || [] };
                        node.send(msg);
                    } else if (config.sendtype === 'multi' && matchingFlowNodes?.userTasks?.length > 1) {
                        matchingFlowNodes.userTasks.forEach((userTask) => {
                            msg.payload = { userTask };
                            node.send(msg);
                        });
                    } else if (matchingFlowNodes?.userTasks?.length >= 1) {
                        msg.payload = { userTask: matchingFlowNodes.userTasks[0] };
                        node.send(msg);
                    } else node.log(`No user tasks found for query: ${JSON.stringify(query)}`);
                })
                .catch((error) => {
                    node.error(error);
                });
        });
    }
    RED.nodes.registerType('usertask-input', UserTaskInput);
};
