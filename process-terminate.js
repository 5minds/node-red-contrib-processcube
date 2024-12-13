module.exports = function (RED) {
    function ProcessTerminate(config) {
        RED.nodes.createNode(this, config);
        var node = this;

        node.on('input', function (msg) {
            node.engine = RED.nodes.getNode(config.engine);
            const client = node.engine.engineClient;

            if (!client) {
                node.error('No engine configured.');
                return;
            }

            client.processInstances
                .terminateProcessInstance(msg.payload)
                .then(() => {
                    node.send(msg);
                })
                .catch((error) => {
                    node.error(JSON.stringify(error));
                });
        });
    }

    RED.nodes.registerType('process-terminate', ProcessTerminate);
};
