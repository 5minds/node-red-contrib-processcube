module.exports = function (RED) {
    function SignalEventTrigger(config) {
        RED.nodes.createNode(this, config);
        var node = this;

        node.on('input', function (msg) {
            node.engine = RED.nodes.getNode(config.engine);

            const client = node.engine.engineClient;

            if (!client) {
                node.error('No engine configured.', msg);
                return;
            }

            client.events
                .triggerSignalEvent(config.signalname, {
                    processInstanceId: msg.processinstanceid,
                    payload: msg.payload,
                })
                .then((result) => {
                    msg.payload = result;

                    node.send(msg);
                    node.status({
                        fill: 'blue',
                        shape: 'dot',
                        text: `signal event triggered`,
                    });
                })
                .catch((error) => {
                    node.error(error, msg);
                });
        });
    }
    RED.nodes.registerType('signal-event-trigger', SignalEventTrigger);
};
