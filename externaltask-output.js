module.exports = function (RED) {
    function ExternalTaskOutput(config) {
        RED.nodes.createNode(this, config);
        var node = this;

        var flowContext = node.context().flow;
        var eventEmitter = flowContext.get('emitter');

        node.on('input', function (msg) {
            const flowNodeInstanceId = msg.flowNodeInstanceId;

            if (!flowNodeInstanceId) {
                node.error('Error: The message did not contain the required external task id.', msg);
            }

            eventEmitter.emit(`handle-${flowNodeInstanceId}`, msg, false);
        });
    }
    RED.nodes.registerType('externaltask-output', ExternalTaskOutput);
};
