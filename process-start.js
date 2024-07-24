const process = require('process');
const engine_client = require('@5minds/processcube_engine_client');

module.exports = function (RED) {
    function ProcessStart(config) {
        RED.nodes.createNode(this, config);
        var node = this;

        this.engine = this.server = RED.nodes.getNode(config.engine);

        const client = this.engine.getEngineClient();

        node.on('input', function (msg) {
            const startParameters = {
                processModelId: msg.processModelId || config.processmodel,
                startEventId: msg.startEventId || config.startevent,
                initialToken: msg.payload,
            };

            client.processDefinitions
                .startProcessInstance(startParameters, node.engine.identity)
                .then((result) => {
                    msg.payload = result;

                    node.send(msg);
                    node.status({
                        fill: 'blue',
                        shape: 'dot',
                        text: `started ${result.processInstanceId}`,
                    });
                })
                .catch((error) => {
                    node.error(error);
                });
        });
    }
    RED.nodes.registerType('process-start', ProcessStart);
};
