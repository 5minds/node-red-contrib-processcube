module.exports = function (RED) {
    function ProcessInstanceDeleteAdvanced(config) {
        RED.nodes.createNode(this, config);
        const node = this;

        node.on('input', async function (msg) {
            node.engine = RED.nodes.getNode(config.engine);
            const client = node.engine ? node.engine.engineClient : null;

            let query = RED.util.evaluateNodeProperty(config.query, config.query_type, node, msg);

            const isUser = !!msg._client?.user && !!msg._client.user.accessToken;
            const userIdentity = isUser ? { userId: msg._client.user.id, token: msg._client.user.accessToken } : null;

            if (!client || !client.processInstances) {
                node.error('No engine or processInstances API configured.', msg);
                return;
            }

            try {
                const result = await client.processInstances.delete(query, config.delete_releated, userIdentity)

                msg.payload = result

                node.send(msg);
            } catch (queryError) {
                node.error(`Failed to delete process instances Error: ${queryError.message}`, msg);
            }
        });
    }

    RED.nodes.registerType('processinstance-delete-advanced', ProcessInstanceDeleteAdvanced);
};
