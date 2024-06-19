const process = require('process');
const engine_client = require('@5minds/processcube_engine_client');

module.exports = function(RED) {
    function ProcessStart(config) {
        RED.nodes.createNode(this,config);
        var node = this;
        var flowContext = node.context().flow;
        var nodeContext = node.context();

        this.engine = this.server = RED.nodes.getNode(config.engine);

        const engineUrl = this.engine?.url || process.env.ENGINE_URL || 'http://engine:8000';

        var client = nodeContext.get('client');

        if (!client) {
            nodeContext.set('client', new engine_client.EngineClient(engineUrl));
            client = nodeContext.get('client');
        }   

        node.on('input', function(msg) {

            const startParameters = {
                processModelId: msg.processModelId || config.processmodel,
                startEventId: msg.startEventId || config.startevent,
                initialToken: msg.payload
            };

            client.processDefinitions.startProcessInstance(startParameters).then((result) => {

                msg.payload = result;
            
                node.send(msg);
                node.status({fill: "blue", shape: "dot", text: `started ${result.processInstanceId}`});
            
            }).catch((error) => {
                node.error(error);
            });
        });
    }
    RED.nodes.registerType("process-start", ProcessStart);
}