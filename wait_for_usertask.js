const process = require('process');

const engine_client = require('@5minds/processcube_engine_client');

module.exports = function (RED) {
    function WaitForUsertask(config) {
        RED.nodes.createNode(this, config);
        var node = this;
        let client = null;
        
        this.engine = this.server = RED.nodes.getNode(config.engine);

        const engineUrl = this.engine?.url || process.env.ENGINE_URL || 'http://engine:8000';

        node.on("close", async () => {
            if (client != null) {
                client.dispose();
                client = null;    
            }
        });

        node.on('input', function (msg) {
            
            const query = RED.util.evaluateNodeProperty(config.query, config.query_type, node, msg)

            client = new engine_client.EngineClient(engineUrl);
            client.userTasks.onUserTaskWaiting((userTaskWaitingNotification) => {

                query['flowNodeInstanceId'] = userTaskWaitingNotification.flowNodeInstanceId;

                client.userTasks.query(query).then((matchingFlowNodes) => {

                    if (matchingFlowNodes.userTasks && matchingFlowNodes.userTasks.length == 1) {
                        userTask = matchingFlowNodes.userTasks[0];

                        msg.payload = { userTask: userTask };
                        node.send(msg);
                    } else {
                        // do nothing, cause we are waiting for a specific user task
                    }

                    // dispose the client
                    if (client != null) {
                        client.dispose();
                        client = null;    
                    }
                });
            });
        });
    }
    RED.nodes.registerType("wait-for-usertask", WaitForUsertask);
}