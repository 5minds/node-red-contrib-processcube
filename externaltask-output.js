module.exports = function (RED) {
    function ExternalTaskOutput(config) {
        RED.nodes.createNode(this, config);
        const node = this;

        const flowContext = node.context().flow;
        let eventEmitter = null;

        node.on('input', function (msg) {
            eventEmitter = flowContext.get('emitter');

            if (!eventEmitter) {
                flowContext.set('emitter', new EventEmitter());
                eventEmitter = flowContext.get('emitter');
            }    

            const flowNodeInstanceId = msg.flowNodeInstanceId;
            const processInstanceId = msg.processInstanceId;

            if (!flowNodeInstanceId) {
                node.error('Error: The message did not contain the required external task id.', msg);
            } else {
                node.log(
                    `handle-${flowNodeInstanceId}: *flowNodeInstanceId* '${flowNodeInstanceId}' and *processInstanceId* '${processInstanceId}' with *msg._msgid* '${msg._msgid}'`,
                );
            }

            eventEmitter.emit(`handle-${flowNodeInstanceId}`, msg, false);
        });
    }
    RED.nodes.registerType('externaltask-output', ExternalTaskOutput);
};
