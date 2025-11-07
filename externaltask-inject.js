const { v4: uuidv4 } = require('uuid');
const EventEmitter = require('node:events');

module.exports = function (RED) {
    function ExternalTaskInject(config) {
        RED.nodes.createNode(this, config);
        var node = this;
        node.config = config;
        node.eventEmitter = new EventEmitter();

        node.on('input', function (msg, send, done) {
            msg.flowNodeInstanceId = msg.flowNodeInstanceId ?? uuidv4();
            msg.processInstanceId = msg.processInstanceId ?? uuidv4();

            if (!msg.task) {
                // Use configured task if available, otherwise create default
                if (config.task) {
                    msg.task = config.task;
                } else {
                    msg.task = {
                        flowNodeInstanceId: msg.flowNodeInstanceId,
                        processInstanceId: msg.processInstanceId,
                        task: {}
                    }
                }
            }
            msg.etw_started_at = new Date().toISOString();
            msg.etw_input_node_id = node.id;

            send(msg);
            if (done) done();
        });

    }

    RED.nodes.registerType('externaltask-inject', ExternalTaskInject);

    // Helper function to parse typed values
    function parseTypedValue(value, type) {
        switch(type) {
            case 'str':
                return value || '';
            case 'num':
                return Number(value) || 0;
            case 'bool':
                return value === 'true' || value === true;
            case 'json':
                try {
                    return JSON.parse(value || '{}');
                } catch(parseErr) {
                    console.error("Invalid JSON: " + parseErr.message);
                    return {};
                }
            case 'jsonata':
                // JSONata expressions would need to be evaluated in Node-RED context
                // For now, treat as string
                return value || '';
            case 'flow':
            case 'global':
                // These are context references - store as string for now
                return value || '';
            default:
                return value || '';
        }
    }

    // HTTP endpoint to handle button clicks
    RED.httpAdmin.post('/externaltask-inject/trigger/:id', function(req, res) {
        var node = RED.nodes.getNode(req.params.id);
        if (node !== null && typeof node !== 'undefined') {
            try {
                var payloadValue = node.config.payload;
                var payloadType = node.config.payloadType || 'json';
                var payloadData = parseTypedValue(payloadValue, payloadType);

                var taskValue = node.config.task;
                var taskType = node.config.taskType || 'json';
                var taskData = parseTypedValue(taskValue, taskType);

                // Create a message with the configured payload and task
                var msg = {
                    payload: payloadData,
                    task: taskData,
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
