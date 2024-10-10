module.exports = function (RED) {
    function ExternalTaskOutput(config) {
        RED.nodes.createNode(this, config);
        const node = this;

        const flowContext = node.context().flow;

        node.on('input', function (msg) {
            const eventEmitter = flowContext.get('emitter');

            if (!eventEmitter) {
                node.error('No event emitter found in flow context.');
                return;
            }

            const flowNodeInstanceId = msg.flowNodeInstanceId;

            if (!flowNodeInstanceId) {
                node.error('Error: The message did not contain the required external task id.', msg);
            }

            eventEmitter.emit(`handle-${flowNodeInstanceId}`, msg, false);
        });
    }
    RED.nodes.registerType('externaltask-output', ExternalTaskOutput);
};
