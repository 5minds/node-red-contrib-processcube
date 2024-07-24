module.exports = function (RED) {
    function ExternalTaskOutput(config) {
        RED.nodes.createNode(this, config);
        var node = this;

        var flowContext = node.context().flow;
        var eventEmitter = flowContext.get('emitter');

        node.on('input', function (msg) {
            const externalTaskId = msg.externalTaskId;

            if (!externalTaskId) {
                node.error('Error: The message did not contain the required external task id.', msg);
            }

            eventEmitter.emit(`finish-${externalTaskId}`, msg.payload);
        });
    }
    RED.nodes.registerType('externaltask-output', ExternalTaskOutput);
};
