const process = require("process");

const engine_client = require("@5minds/processcube_engine_client");

module.exports = function (RED) {
    function MessageEventTrigger(config) {
        RED.nodes.createNode(this, config);
        var node = this;

        this.engine = this.server = RED.nodes.getNode(config.engine);

        const client = this.engine.getEngineClient();

        node.on("input", function (msg) {
            client.events
                .triggerMessageEvent(config.messagename, {
                    processInstanceId: config.processinstanceid,
                    payload: msg.payload,
                    identity: node.server.identity,
                })
                .then((result) => {
                    msg.payload = result;

                    node.send(msg);
                    node.status({
                        fill: "blue",
                        shape: "dot",
                        text: `message event triggered`,
                    });
                })
                .catch((error) => {
                    node.error(error);
                });
        });
    }
    RED.nodes.registerType("message-event-trigger", MessageEventTrigger);
};
