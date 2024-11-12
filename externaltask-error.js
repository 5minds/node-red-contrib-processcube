module.exports = function (RED) {
    function ExternalTaskError(config) {
        RED.nodes.createNode(this, config);
        var node = this;

        const flowContext = node.context().flow;
        let eventEmitter = null;

        node.on('input', function (msg) {
            eventEmitter = flowContext.get('emitter');

            if (!eventEmitter) {
                flowContext.set('emitter', new EventEmitter());
                eventEmitter = flowContext.get('emitter');
            }    
            
            const flowNodeInstanceId = msg.flowNodeInstanceId;

            let msgError = msg.error;

            if (msgError === undefined) {
                msgError.message = 'An error occurred';
            }

            const error = new Error(msgError.message);
            error.errorCode = config.error || {};
            error.errorDetails = RED.util.encodeObject(msg);

            msg.errorCode = config.error;
            msg.errorMessage = msgError.message;

            node.log(`handle-${flowNodeInstanceId}: *flowNodeInstanceId* '${flowNodeInstanceId}' with *msg._msgid* '${msg._msgid}'`);

            eventEmitter.emit(`handle-${flowNodeInstanceId}`, error, true);

            node.send(msg);
        });
    }
    RED.nodes.registerType('externaltask-error', ExternalTaskError);
};
