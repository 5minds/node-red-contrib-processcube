module.exports = function (RED) {
    function SignalEventTrigger(config) {
        RED.nodes.createNode(this, config);
        var node = this;

        node.on('input', function (msg) {
            const engine = RED.nodes.getNode(config.engine);

            const client = engine.engineClient;

            if (!client) {
                node.error('No engine configured.');
                return;
            }
    
            client.events
                .triggerSignalEvent(config.signalname, {
                    processInstanceId: config.processinstanceid,
                    payload: msg.payload,
                    identity: engine.identity,
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
                    node.error(error);
                });
        });
    }
    RED.nodes.registerType('signal-event-trigger', SignalEventTrigger);
};
