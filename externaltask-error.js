module.exports = function (RED) {
    function ExternalTaskError(config) {
        RED.nodes.createNode(this, config);
        var node = this;

        node.on('input', function (msg) {            
            const flowNodeInstanceId = msg.flowNodeInstanceId;
            const etw_input_node_id = msg.etw_input_node_id;
           
            if (!etw_input_node_id) {
                node.error('Error: The message did not contain the required etw_input_node_id.');
            } else {
                const etwInputNode = RED.nodes.getNode(etw_input_node_id);

                if (!etwInputNode) {
                    node.error('Error: The message did not contain the required etw_input_node_id.');
                } else {
                    let msgError = msg.error;

                    if (msgError === undefined) {
                        msgError.message = 'An error occurred';
                    }

                    const error = new Error(msgError.message);
                    error.errorCode = config.error || {};
                    error.errorDetails = RED.util.encodeObject(msg);

                    msg.errorCode = config.error;
                    msg.errorMessage = msgError.message;

                    node.log(`handle-${flowNodeInstanceId}: *flowNodeInstanceId* '${flowNodeInstanceId}' with *msg._msgid* '${msg._msgid}'`);

                    etwInputNode.eventEmitter.emit(`handle-${flowNodeInstanceId}`, error, true);

                    node.send(msg);
                }
            }
        });
    }
    RED.nodes.registerType('externaltask-error', ExternalTaskError);
};
