const process = require("process");
const EventEmitter = require("node:events");

const engine_client = require("@5minds/processcube_engine_client");

module.exports = function (RED) {
    function ProcessinstanceQuery(config) {
        RED.nodes.createNode(this, config);
        var node = this;
        var flowContext = node.context().flow;

        this.engine = this.server = RED.nodes.getNode(config.engine);

        const client = this.engine.getEngineClient();

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
                    msg.payload = matchingInstances;

                    node.send(msg);
                });
        });
    }
    RED.nodes.registerType("processinstance-query", ProcessinstanceQuery);
};
