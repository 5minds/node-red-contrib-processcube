module.exports = function (RED) {
    function UserTaskOutput(config) {
        RED.nodes.createNode(this, config);
        var node = this;

        node.on('input', function (msg) {
            if (msg.payload.userTask) {
                const flowNodeInstanceId = msg.payload.userTask.flowNodeInstanceId;

                const userTaskResult = RED.util.evaluateNodeProperty(config.result, config.result_type, node, msg);

                const engine = RED.nodes.getNode(config.engine);

                const client = engine.engineClient;

                if (!client) {
                    node.error('No engine configured.');
                    return;
                }
        
                client.userTasks
                    .finishUserTask(flowNodeInstanceId, userTaskResult, engine.identity)
                    .then(() => {
                        node.send(msg);
                    })
                    .catch((error) => {
                        node.error(JSON.stringify(error));
                    });
            } else {
                node.error(`No UserTask found in message: ${JSON.stringify(msg.payload)}`);
            }
        });
    }

    RED.nodes.registerType('usertask-output', UserTaskOutput);
};
