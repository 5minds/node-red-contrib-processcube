module.exports = function (RED) {
    function ExternalTaskInputInject(config) {
        RED.nodes.createNode(this, config);
        var node = this;

        node.config = config;


        node.on('input', async function (msg, send, done) {
            node.externalTask = RED.nodes.getNode(node.config.externaltask);

            if (node.externalTask) {
                node.log(`Received message: ${JSON.stringify(msg)} and send to external task ${node.externalTask.id}.`);

                node.externalTask.injectNodeCallback = (msg) => {
                    send(msg);
                    done()
                }

                if (node.externalTask.injectCall) {
                    node.externalTask.injectCall(msg).catch((error) => {
                        node.error(`Error in inject call: ${error.message}`, {});
                        done(`Error in inject call: ${error.message}`);
                    });
                } else {
                    node.error('No inject call found.');
                    done('No inject call found.');
                }
            } else {
                node.error('No external task node found.');
                done('No external task node found.');
            }
        });

    }

    RED.nodes.registerType('externaltask-input-inject', ExternalTaskInputInject);
};
