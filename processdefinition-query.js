module.exports = function (RED) {
    function ProcessdefinitionQuery(config) {
        RED.nodes.createNode(this, config);
        var node = this;

        node.on('input', function (msg) {
            node.engine = RED.nodes.getNode(config.engine);
            const client = node.engine.engineClient;

            if (!client) {
                node.error('No engine configured.', msg);
                return;
            }

            let query = RED.util.evaluateNodeProperty(config.query, config.query_type, node, msg);

            if (typeof query !== 'object' || Array.isArray(query) || query === null) {
                query = {};
            }

            node.log(`Querying process definitions with query: ${JSON.stringify(query)}`);

            const isUser = !!msg._client?.user && !!msg._client.user.accessToken;
            const identity = isUser ? { userId: msg._client.user.id, token: msg._client.user.accessToken } : null;
            query.identity = identity;

            client.processDefinitions
                .getAll(query)
                .then((matchingProcessDefinitions) => {
                    if (config.models_only) {
                        const models = matchingProcessDefinitions.processDefinitions.flatMap(processDefinition => processDefinition.processModels);

                        msg.payload = {
                            models: models,
                            totalCount: models.length,
                        };
                    } else {
                        msg.payload = matchingProcessDefinitions;
                    }

                    node.send(msg);
                })
                .catch((error) => {
                    node.error(error, msg);
                });
        });
    }
    RED.nodes.registerType('processdefinition-query', ProcessdefinitionQuery);
};
