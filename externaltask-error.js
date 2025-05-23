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
                    let errorCode = config.error;
                    let errorMessage = config.message;
                    let errorDetails = RED.util.encodeObject(msg);

                    if (msgError) {
                        if (msgError.code) {
                            errorCode = msgError.code;
                            errorMessage = msgError.message;
                        } 
                    } else if (msg.errorCode) {
                        errorCode = msg.errorCode;
                        errorMessage = msg.errorMessage;
                    }

                    const error = new Error(errorMessage);
                    error.errorCode = errorCode;
                    error.errorDetails = errorDetails;

                    if (!error.etw_started_at) {
                        error.etw_started_at = msg.errorDetails?.etw_started_at || msg.etw_started_at;
                    }

                    msg.errorCode = errorCode;
                    msg.errorMessage = errorMessage;

                    node.log(`handle-${flowNodeInstanceId}: *flowNodeInstanceId* '${flowNodeInstanceId}' with *msg._msgid* '${msg._msgid}'`);

                    etwInputNode.eventEmitter.emit(`handle-${flowNodeInstanceId}`, error, true);

                    node.send(msg);
                }
            }
        });
    }
    RED.nodes.registerType('externaltask-error', ExternalTaskError);
};
