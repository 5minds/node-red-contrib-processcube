module.exports = function (RED) {
    function ProcessdefinitionDeploy(config) {
        RED.nodes.createNode(this, config);
        var node = this;

        node.on('input', function (msg) {
            node.engine = RED.nodes.getNode(config.engine);
            const client = node.engine.engineClient;

            if (!client) {
                node.error('No engine configured.');
                return;
            }
     
            client.processDefinitions
                .persistProcessDefinitions(msg.payload, { overwriteExisting: true  })
                .then(() => {
                    node.send(msg);
                })
                .catch((error) => {
                    node.error(error, {});
                });
        });
    }
    RED.nodes.registerType('processdefinition-deploy', ProcessdefinitionDeploy);
};
