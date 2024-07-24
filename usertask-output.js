const EventEmitter = require("node:events");

module.exports = function (RED) {
    function UserTaskOutput(config) {
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

        node.on('input', function (msg) {
            if (msg.payload.userTask) {
                const flowNodeInstanceId = msg.payload.userTask.flowNodeInstanceId;

                const userTaskResult = RED.util.evaluateNodeProperty(config.result, config.result_type, node, msg);

                client.userTasks
                    .finishUserTask(flowNodeInstanceId, userTaskResult, node.server.identity)
                    .then(() => {
                        node.send(msg);
                    })
                    .catch((error) => {
                        node.error(error);
                    });
            } else {
                node.error(
                    `No UserTask found in message: ${JSON.stringify(msg.payload)}`
                );
            }
        });
    }

    RED.nodes.registerType('usertask-output', UserTaskOutput);
};
