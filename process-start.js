module.exports = function (RED) {
    function ProcessStart(config) {
        RED.nodes.createNode(this, config);
        var node = this;

        node.on('input', function (msg) {
            const initialToken = RED.util.encodeObject(msg.payload);

            const startParameters = {
                processModelId: msg.processModelId || config.processmodel,
                startEventId: msg.startEventId || config.startevent,
                initialToken: initialToken,
            };

            if (!startParameters.processModelId) {
                node.error('No processModelId configured.');
            }

            if (!startParameters.startEventId) {
                node.error('No startEventId configured.');
            }

            const engine = RED.nodes.getNode(config.engine);
            const client = engine.engineClient;

            if (!client) {
                node.error('No engine configured.');
                return;
            }

            client.processDefinitions
                .startProcessInstance(startParameters, engine.identity)
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
