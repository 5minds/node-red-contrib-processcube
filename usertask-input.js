module.exports = function (RED) {
    function UserTaskInput(config) {
        RED.nodes.createNode(this, config);
        var node = this;

        node.on('input', function (msg) {

            const engine = RED.nodes.getNode(config.engine);

            const client = engine.engineClient;

            if (!client) {
                node.error('No engine configured.');
                return;
            }

            let query = RED.util.evaluateNodeProperty(config.query, config.query_type, node, msg);

            query = {
                ...query,
                identity: engine.identity,
            };

            client.userTasks.query(query).then((matchingFlowNodes) => {
                if (
                    !config.force_send_array &&
                    matchingFlowNodes &&
                    matchingFlowNodes.userTasks &&
                    matchingFlowNodes.userTasks.length == 1
                ) {
                    userTask = matchingFlowNodes.userTasks[0];

                    msg.payload = { userTask: userTask };
                    node.send(msg);
                } else {
                    if (!config.force_send_array) {
                        if (config.multisend && matchingFlowNodes.userTasks && matchingFlowNodes.userTasks.length > 1) {
                            matchingFlowNodes.userTasks.forEach((userTask) => {
                                msg.payload = { userTask: userTask };
                                node.send(msg);
                            });
                        } else {
                            if (matchingFlowNodes.userTasks == 1) {
                                msg.payload = {
                                    userTasks: matchingFlowNodes.userTasks,
                                };
                                node.send(msg);    
                            } else {
                                node.log(`No user tasks found for query: ${JSON.stringify(query)}`); 
                            }
                        }
                    } else {
                        msg.payload = {
                            userTasks: matchingFlowNodes.userTasks || [],
                        };
                        node.send(msg);
                    }
                }
            });
        });
    }
    RED.nodes.registerType('usertask-input', UserTaskInput);
};
