const EventAggregator = require('./EventAggregator');

module.exports = function(RED) {
    function ExternalTaskOutput(config) {
        RED.nodes.createNode(this,config);
        var node = this;

        node.on('input', function(msg) {

            //const externalTaskId = msg.payload.externalTaskId;
            const externalTaskId = msg.externalTaskId;
            EventAggregator.publish(`finish-${externalTaskId}`, msg.payload);
        });     
    }
    RED.nodes.registerType("externaltask-output", ExternalTaskOutput);
}