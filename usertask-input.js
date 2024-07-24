const EventEmitter = require("node:events");

module.exports = function (RED) {
    function UserTaskInput(config) {
        RED.nodes.createNode(this, config);
        var node = this;
        var flowContext = node.context().flow;

        this.engine = this.server = RED.nodes.getNode(config.engine);

        const client = this.engine.getEngineClient();

        var eventEmitter = flowContext.get("emitter");

        if (!eventEmitter) {
            flowContext.set("emitter", new EventEmitter());
            eventEmitter = flowContext.get("emitter");
        }

        node.on('close', async () => {
            client.dispose();
            client = null;
        });

        node.on('input', function (msg) {
            let query = RED.util.evaluateNodeProperty(config.query, config.query_type, node, msg);

            query = {
                ...query,
                identity: node.server.identity,
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
                        if (
                            config.multisend &&
                            matchingFlowNodes.userTasks &&
                            matchingFlowNodes.userTasks.length > 1
                        ) {
                            matchingFlowNodes.userTasks.forEach((userTask) => {
                                msg.payload = { userTask: userTask };
                                node.send(msg);
                            });
                        } else {
                            msg.payload = { userTasks: matchingFlowNodes.userTasks };
                            node.send(msg);
                        }
                    } else {
                        msg.payload = { userTasks: matchingFlowNodes.userTasks || [] };
                        node.send(msg);
                    }
                }
            });
        });
    }
    RED.nodes.registerType('usertask-input', UserTaskInput);
};
