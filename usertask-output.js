module.exports = function (RED) {
    function UserTaskOutput(config) {
        RED.nodes.createNode(this, config);
        var node = this;

        node.on('input', function (msg) {
            if (msg.payload.userTask) {
                const flowNodeInstanceId = msg.payload.userTask.flowNodeInstanceId;

                let userTaskResult = RED.util.evaluateNodeProperty(config.result, config.result_type, node, msg);

                // remote msg and format from result
                delete userTaskResult.format;
                delete userTaskResult.msg;


                node.engine = RED.nodes.getNode(config.engine);

                const client = node.engine.engineClient;

                if (!client) {
                    node.error('No engine configured.');
                    return;
                }

                client.userTasks
                    .finishUserTask(flowNodeInstanceId, userTaskResult)
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
