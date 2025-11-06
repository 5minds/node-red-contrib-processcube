const { v4: uuidv4 } = require('uuid');

module.exports = function (RED) {
    function ExternalTaskInputInject(config) {
        RED.nodes.createNode(this, config);
        var node = this;

        node.config = config;

        node.on('input', function (msg, send, done) {
            msg.flowNodeInstanceId = msg.flowNodeInstanceId ?? uuidv4();
            msg.processInstanceId = msg.processInstanceId ?? uuidv4();

            if (!msg.task) {
                msg.task = {
                    flowNodeInstanceId: msg.flowNodeInstanceId,
                    processInstanceId: msg.processInstanceId,
                    task: {}
                }
            }

            msg.etw_inject_node_id = node.id;

            send(msg);
            if (done) done();
        });

    }

    RED.nodes.registerType('externaltask-input-inject', ExternalTaskInputInject);

    // HTTP endpoint to handle button clicks
    RED.httpAdmin.post('/externaltask-input-inject/trigger/:id', function(req, res) {
        var node = RED.nodes.getNode(req.params.id);
        if (node !== null && typeof node !== 'undefined') {
            try {
                var payloadValue = node.config.payload;
                var payloadType = node.config.payloadType || 'json';
                var payloadData;

                // Parse payload based on type
                switch(payloadType) {
                    case 'str':
                        payloadData = payloadValue || '';
                        break;
                    case 'num':
                        payloadData = Number(payloadValue) || 0;
                        break;
                    case 'bool':
                        payloadData = payloadValue === 'true' || payloadValue === true;
                        break;
                    case 'json':
                        try {
                            payloadData = JSON.parse(payloadValue || '{}');
                        } catch(parseErr) {
                            node.error("Invalid JSON in configured payload: " + parseErr.message);
                            payloadData = {};
                        }
                        break;
                    case 'jsonata':
                        // JSONata expressions would need to be evaluated in Node-RED context
                        // For now, treat as string
                        payloadData = payloadValue || '';
                        break;
                    case 'flow':
                    case 'global':
                        // These are context references - store as string for now
                        payloadData = payloadValue || '';
                        break;
                    default:
                        payloadData = payloadValue || '';
                }

                // Create a message with the configured payload
                var msg = {
                    payload: payloadData,
                    _msgid: uuidv4()
                };

                // Trigger the node's input handler with the configured message
                node.receive(msg);
                res.sendStatus(200);
            } catch(err) {
                res.sendStatus(500);
                node.error("Error injecting message: " + err.message);
            }
        } else {
            res.sendStatus(404);
        }
    });
};
