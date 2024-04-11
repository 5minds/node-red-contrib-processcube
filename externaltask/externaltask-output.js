const EventAggregator = require('./EventAggregator');

module.exports = function(RED) {
    function ExternalTaskOutput(config) {
        RED.nodes.createNode(this,config);
        var node = this;

        node.on('input', function(msg) {

            var flowContext = this.context().flow;
            const externalTaskId = flowContext.get('externalTaskId');
            EventAggregator.publish(`finish-${externalTaskId}`, msg.payload);
        });     
    }
    RED.nodes.registerType("externaltask-output", ExternalTaskOutput);
}