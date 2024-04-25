const EventAggregator = require('./EventAggregator');

module.exports = function(RED) {
    function ExternalTaskError(config) {
        RED.nodes.createNode(this,config);
        var node = this;

        node.on('input', function(msg) {

            const externalTaskId = msg.externalTaskId;

            msg.payload = {
                "error": {
                    errorCode: config.error,
                    errorMessage: msg.error.message,
                    errorDetails: msg.error.source
                }
            };

            EventAggregator.eventEmitter.emit(`error-${externalTaskId}`, msg.payload);
        });     
    }
    RED.nodes.registerType("externaltask-error", ExternalTaskError);
}