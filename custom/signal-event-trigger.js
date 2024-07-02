const process = require('process');

const engine_client = require('@5minds/processcube_engine_client');

module.exports = function(RED) {
    function SignalEventTrigger(config) {
        RED.nodes.createNode(this, config);
        var node = this;
        var nodeContext = node.context();

        this.engine = this.server = RED.nodes.getNode(config.engine);

        const engineUrl = this.engine?.url || process.env.ENGINE_URL || 'http://engine:8000';

        var client = nodeContext.get('client');

        if (!client) {
            nodeContext.set('client', new engine_client.EngineClient(engineUrl));
            client = nodeContext.get('client');
        } 

        node.on('input', function(msg) {

            client.events.triggerSignalEvent(
                config.signalname,
                {
                  processInstanceId: config.processinstanceid,
                  payload: msg.payload
                }
            
            ).then((result) => {

                msg.payload = result;
            
                node.send(msg);
                node.status({fill: "blue", shape: "dot", text: `signal event triggered`});
            
            }).catch((error) => {
                node.error(error);
            });
        });
    }
    RED.nodes.registerType("signal-event-trigger", SignalEventTrigger);
}