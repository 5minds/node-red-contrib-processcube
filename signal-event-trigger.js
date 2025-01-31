module.exports = function (RED) {
    function SignalEventTrigger(config) {
        RED.nodes.createNode(this, config);
        var node = this;

        node.on('input', function (msg) {
            node.engine = RED.nodes.getNode(config.engine);

            const client = node.engine.engineClient;
            const isUser = !!msg._client?.user;
            const userIdentity = isUser ? { userId: msg._client.user.id, token: msg._client.user.accessToken } : null;

            if (!client) {
                node.error('No engine configured.', msg);
                return;
            }

            client.events
                .triggerSignalEvent(config.signalname, {
                    processInstanceId: msg.processinstanceid,
                    payload: msg.payload,
                    identity: userIdentity,
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
