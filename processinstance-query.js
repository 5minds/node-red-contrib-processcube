const process = require("process");
const EventEmitter = require("node:events");

const engine_client = require("@5minds/processcube_engine_client");

module.exports = function (RED) {
    function ProcessinstanceQuery(config) {
        RED.nodes.createNode(this, config);
        var node = this;
        var flowContext = node.context().flow;
        var nodeContext = node.context();

        this.engine = this.server = RED.nodes.getNode(config.engine);

        const engineUrl =
            this.engine?.url || process.env.ENGINE_URL || "http://engine:8000";

        var client = nodeContext.get("client");

        if (!client) {
            nodeContext.set(
                "client",
                new engine_client.EngineClient(engineUrl)
            );
            client = nodeContext.get("client");
        }

        var eventEmitter = flowContext.get("emitter");

        if (!eventEmitter) {
            flowContext.set("emitter", new EventEmitter());
            eventEmitter = flowContext.get("emitter");
        }

        node.on("close", async () => {
            client.dispose();
            client = null;
        });

        node.on("input", function (msg) {
            let query = RED.util.evaluateNodeProperty(
                config.query,
                config.query_type,
                node,
                msg
            );

            client.processInstances
                .query(query, { identity: node.server.identity })
                .then((matchingInstances) => {
                    console.log(matchingInstances);
                    msg.payload = matchingInstances;

                    node.send(msg);
                })
                .catch((error) => {
                    node.error(`Processinstancequery failed: ${error.message}`);
                });
        });
    }
    RED.nodes.registerType("processinstance-query", ProcessinstanceQuery);
};
