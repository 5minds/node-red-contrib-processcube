module.exports = function (RED) {
    function ProcessinstanceQuery(config) {
        RED.nodes.createNode(this, config);
        var node = this;

        node.on('input', function (msg) {
            let query = RED.util.evaluateNodeProperty(config.query, config.query_type, node, msg);
            

            node.engine = RED.nodes.getNode(config.engine);
            const client = node.engine.engineClient;
            const isUser = !!msg._client?.user && !!msg._client.user.accessToken;
            const userIdentity = isUser ? { userId: msg._client.user.id, token: msg._client.user.accessToken } : null;

            if (!client) {
                node.error('No engine configured.', msg);
                return;
            }

            let query_options = {identity: userIdentity};

            let limit = config.limit;
            if (msg.limit !== undefined) {
                limit = msg.limit;
            }

            if (limit) {
                query_options.limit = limit;
            }

            let offset = config.offset;
            if (msg.offset !== undefined) {
                offset = msg.offset;
            }

            if (offset) {
                query_options.offset = offset;
            }
 
            client.processInstances
                .query(query, query_options)
                .then((matchingInstances) => {
                    msg.payload = matchingInstances;

                    node.send(msg);
                })
                .catch((error) => {
                    node.error(`Processinstancequery failed: ${error.message}`, msg);
                });
        });
    }
    RED.nodes.registerType('processinstance-query', ProcessinstanceQuery);
};
