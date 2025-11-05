const { v4: uuidv4 } = require('uuid');

module.exports = function (RED) {
    function ExternalTaskInputInject(config) {
        RED.nodes.createNode(this, config);
        var node = this;

        node.config = config;


        node.on('input', async function (msg, send, done) {
            node.externalTask = RED.nodes.getNode(node.config.externaltask);

            if (node.externalTask) {
                node.log(`Received message: ${JSON.stringify(msg)} and send to external task ${node.externalTask.id}.`);

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
                done('No external task node found.');
            }
        });

    }

    RED.nodes.registerType('externaltask-input-inject', ExternalTaskInputInject);
    RED.hooks.add("onReceive", (receiveEvent) => {
        console.log(JSON.stringify(Object.keys(receiveEvent.destination.node)));

        if (receiveEvent.destination.node.type === 'externaltask-output' || receiveEvent.destination.node.type === 'externaltask-error') {

            if (receiveEvent.msg && receiveEvent.msg.etw_inject_node_id) {

                const injectNode = RED.nodes.getNode(receiveEvent.msg.etw_inject_node_id);

                injectNode.send(receiveEvent.msg);
                return false;
            }
        }

        return true;
    });
};
