module.exports = function (RED) {
    function ExternalTaskError(config) {
        RED.nodes.createNode(this, config);
        var node = this;

        var flowContext = node.context().flow;
        var eventEmitter = flowContext.get('emitter');

        node.on('input', function (msg) {
            const externalTaskId = msg.externalTaskId;

            let error = msg.error;

            if (error === undefined) {
                error.message = 'An error occurred';
                error.source = msg.payload;
            }

            msg.payload = {
                error: {
                    errorCode: config.error,
                    errorMessage: error.message,
                    errorDetails: error.source,
                },
            };

            eventEmitter.emit(`error-${externalTaskId}`, msg.payload);

            node.send(msg);
        });
    }
    RED.nodes.registerType('externaltask-error', ExternalTaskError);
};
