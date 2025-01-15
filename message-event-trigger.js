module.exports = function (RED) {
    function MessageEventTrigger(config) {
        RED.nodes.createNode(this, config);
        var node = this;

        node.on('input', function (msg) {
            node.engine = RED.nodes.getNode(config.engine);
            const client = node.engine.engineClient;

            if (!client) {
                node.error('No engine configured.');
                return;
            }

            node.engine.engineClient.events
                .triggerMessageEvent(config.messagename, {
                    processInstanceId: msg.processinstanceid,
                    payload: { payload: msg.payload },
                })
                .then((result) => {
                    msg.payload = result;

                    node.send(msg);
                    node.status({
                        fill: 'blue',
                        shape: 'dot',
                        text: `message event triggered`,
                    });
                })
                .catch((error) => {
                    node.error(error);
                });
        });
    }
    RED.nodes.registerType('message-event-trigger', MessageEventTrigger);
};
