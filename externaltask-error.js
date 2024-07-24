module.exports = function (RED) {
    function ExternalTaskError(config) {
        RED.nodes.createNode(this, config);
        var node = this;

        var flowContext = node.context().flow;
        var eventEmitter = flowContext.get('emitter');

        node.on('input', function (msg) {
            const flowNodeInstanceId = msg.flowNodeInstanceId;

            let msgError = msg.error;

            if (msgError === undefined) {
                msgError.message = 'An error occurred';
            }

            const error = new Error(msgError.message);
            error.errorCode = config.error;
            error.errorDetails = RED.util.encodeObject(msg);

            msg.errorCode = config.error;
            msg.errorMessage = msgError.message;

            eventEmitter.emit(`handle-${flowNodeInstanceId}`, error, true);

            node.send(msg);
        });
    }
    RED.nodes.registerType('externaltask-error', ExternalTaskError);
};
