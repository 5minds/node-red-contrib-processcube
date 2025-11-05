const { v4: uuidv4 } = require('uuid');

module.exports = function (RED) {
    function ExternalTaskInputInject(config) {
        RED.nodes.createNode(this, config);
        var node = this;

        node.config = config;

        // Function to send a message to the external task
        function sendMessageToExternalTask(msg) {
            node.externalTask = RED.nodes.getNode(node.config.externaltask);

            if (node.externalTask) {
                node.log(`Injecting message: ${JSON.stringify(msg)} to external task ${node.externalTask.id}.`);

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
                msg.etw_input_node_id = node.externalTask.id;

                node.externalTask.send(msg);
            } else {
                node.error('No external task node found.');
            }
        }

        node.on('input', async function (msg, send, done) {
            sendMessageToExternalTask(msg);
        });

    }

    RED.nodes.registerType('externaltask-input-inject', ExternalTaskInputInject);

    // HTTP endpoint to handle button clicks
    RED.httpAdmin.post('/externaltask-input-inject/trigger/:id', function(req, res) {
        var node = RED.nodes.getNode(req.params.id);
        if (node !== null && typeof node !== 'undefined') {
            try {
                // Create a default message when button is clicked
                var msg = {
                    payload: {},
                    _msgid: uuidv4()
                };

                // Trigger the node's input handler with the default message
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

    RED.hooks.add("onReceive", (receiveEvent) => {
        if (receiveEvent.destination.node.type === 'externaltask-output' || receiveEvent.destination.node.type === 'externaltask-error') {

            if (receiveEvent.msg && receiveEvent.msg.etw_inject_node_id) {

                const injectNode = RED.nodes.getNode(receiveEvent.msg.etw_inject_node_id);

                if (injectNode) {
                    injectNode.send(receiveEvent.msg);
                }
                return false;
            }
        }

        return true;
    });
};
