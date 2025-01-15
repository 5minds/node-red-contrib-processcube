module.exports = function (RED) {
    function ProcessStart(config) {
        RED.nodes.createNode(this, config);
        var node = this;

        node.on('input', function (msg) {
            let initialToken = {};

            if (msg.payload) {
                initialToken = RED.util.encodeObject(msg.payload);

                // remote msg and format from result
                if (initialToken) {
                    delete initialToken.msg;
                    delete initialToken.format;    
                }
            } 

            const startParameters = {
                processModelId: msg.processModelId || config.processmodel,
                startEventId: msg.startEventId || config.startevent,
                initialToken: initialToken,
            };

            if (!startParameters.processModelId) {
                node.error('No processModelId configured.', msg);
                return;
            }

            if (!startParameters.startEventId) {
                node.error('No startEventId configured.', msg);
                return;
            }

            node.engine = RED.nodes.getNode(config.engine);
            const client = node.engine.engineClient;

            if (!client) {
                node.error('No engine configured.', msg);
                return;
            }

            client.processDefinitions
                .startProcessInstance(startParameters)
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
                    node.error(error, msg);
                });
        });
    }

    RED.nodes.registerType('process-start', ProcessStart);
};
