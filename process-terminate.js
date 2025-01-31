module.exports = function (RED) {
    function ProcessTerminate(config) {
        RED.nodes.createNode(this, config);
        var node = this;

        node.on('input', function (msg) {
            node.engine = RED.nodes.getNode(config.engine);
            const client = node.engine.engineClient;
            const isUser = !!msg._client?.user;
            const userIdentity = isUser ? { userId: msg._client.user.id, token: msg._client.user.accessToken } : null;

            if (!client) {
                node.error('No engine configured.', msg);
                return;
            }

            client.processInstances
                .terminateProcessInstance(msg.payload, userIdentity)
                .then(() => {
                    node.send(msg);
                })
                .catch((error) => {
                    node.error(error, msg);
                });
        });
    }

    RED.nodes.registerType('process-terminate', ProcessTerminate);
};
