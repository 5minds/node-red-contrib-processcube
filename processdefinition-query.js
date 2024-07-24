const process = require('process');
const EventEmitter = require('node:events');

const engine_client = require('@5minds/processcube_engine_client');

module.exports = function (RED) {
    function ProcessdefinitionQuery(config) {
        RED.nodes.createNode(this, config);
        var node = this;
        var flowContext = node.context().flow;
        var nodeContext = node.context();

        this.engine = this.server = RED.nodes.getNode(config.engine);

        const engineUrl = this.engine?.url || process.env.ENGINE_URL || 'http://engine:8000';

        var client = nodeContext.get('client');

        if (!client) {
            nodeContext.set('client', new engine_client.EngineClient(engineUrl));
            client = nodeContext.get('client');
        }

        var eventEmitter = flowContext.get('emitter');

        if (!eventEmitter) {
            flowContext.set('emitter', new EventEmitter());
            eventEmitter = flowContext.get('emitter');
        }

        node.on('close', async () => {
            client.dispose();
            client = null;
        });

        node.on('input', function (msg) {
            let query = RED.util.evaluateNodeProperty(config.query, config.query_type, node, msg);
            query = {
                ...query,
                identity: node.server.identity,
            };

            client.processDefinitions.getAll(query).then((matchingProcessDefinitions) => {
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
            });
        });
    }
    RED.nodes.registerType('processdefinition-query', ProcessdefinitionQuery);
};
