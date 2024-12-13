module.exports = function (RED) {
    function ProcessdefinitionQuery(config) {
        RED.nodes.createNode(this, config);
        var node = this;

        node.on('input', function (msg) {
            node.engine = RED.nodes.getNode(config.engine);
            const client = engine.engineClient;

            if (!client) {
                node.error('No engine configured.');
                return;
            }

            let query = RED.util.evaluateNodeProperty(config.query, config.query_type, node, msg);

            node.log(`Querying process definitions with query: ${JSON.stringify(query)}`);

            client.processDefinitions
                .getAll(query)
                .then((matchingProcessDefinitions) => {
                    if (config.models_only && matchingProcessDefinitions.totalCount > 0) {
                        let models = [];

                        matchingProcessDefinitions.processDefinitions.forEach((processDefinition) => {
                            processDefinition.processModels.forEach((model) => {
                                models.push(model);
                            });
                        });

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
                    node.error(error);
                });
        });
    }
    RED.nodes.registerType('processdefinition-query', ProcessdefinitionQuery);
};
