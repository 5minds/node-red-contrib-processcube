module.exports = function (RED) {
    function ExternalTaskOutput(config) {
        RED.nodes.createNode(this, config);
        const node = this;

        node.on('input', function (msg) {

            const flowNodeInstanceId = msg.flowNodeInstanceId;
            const processInstanceId = msg.processInstanceId;
            const etw_input_node_id = msg.etw_input_node_id;

            if (!etw_input_node_id) {
                node.error('Error: The message did not contain the required etw_input_node_id.', msg);
            } else {

                const etwInputNode = RED.nodes.getNode(etw_input_node_id);

                if (!etwInputNode) {
                    node.error('Error: The message did not contain the required etw_input_node_id.', msg);
                } else {

                    if (!flowNodeInstanceId) {
                        node.error('Error: The message did not contain the required external task id.', msg);
                    } else {
                        node.log(
                            `handle-${flowNodeInstanceId}: *flowNodeInstanceId* '${flowNodeInstanceId}' and *processInstanceId* '${processInstanceId}' with *msg._msgid* '${msg._msgid}'`,
                        );
                    }

                    etwInputNode.eventEmitter.emit(`handle-${flowNodeInstanceId}`, msg, false);
                }
            }
        });
    }
    RED.nodes.registerType('externaltask-output', ExternalTaskOutput);
};
