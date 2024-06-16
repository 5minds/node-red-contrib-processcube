const process = require('process');
const EventEmitter = require('node:events');

const engine_client = require('@5minds/processcube_engine_client');

function showStatus(node, msgCounter) {
    if (msgCounter >= 1) {
        node.status({fill: "blue", shape: "dot", text: `handling tasks ${msgCounter}`});
    } else {
        node.status({fill: "blue", shape: "ring", text: `subcribed ${msgCounter}`});
    }
}

module.exports = function(RED) {
    function UserTaskInput(config) {
        RED.nodes.createNode(this,config);
        var node = this;
        var msgCounter = 0;
        var flowContext = node.context().flow;
        var nodeContext = node.context();

        this.engine = this.server = RED.nodes.getNode(config.engine);

        const engineUrl = this.engine?.url || process.env.ENGINE_URL || 'http://engine:8000';

        var client = nodeContext.get('client');

        if (!client) {
            nodeContext.set('client', new engine_client.EngineClient(engineUrl));
            client = nodeContext.get('client');
        }   

        var eventEmitter = flowContext.get('emitter');

        if (!eventEmitter) {
            flowContext.set('emitter', new EventEmitter());
            eventEmitter = flowContext.get('emitter');
        }

        node.on("close", async () => {
            client.dispose();
            client = null;
        });

        node.on('input', async function(msg) {
            console.log(`UserTaskInput received message: ${JSON.stringify(msg.payload)}`);

            let query = msg.payload;
            query = {"flowNodeInstanceId":"1f7225f4-f3c0-4865-91ad-8c6c71d23c22"};

            console.log(`UserTaskInput query: ${JSON.stringify(query)}`);

            client.userTasks.query({
                "flowNodeInstanceId" : "1f7225f4-f3c0-4865-91ad-8c6c71d23c22"
            }).then((matchingFlowNodes) => {

                console.log(`UserTaskInput query result: ${JSON.stringify(matchingFlowNodes)}`);
                
                if (matchingFlowNodes && matchingFlowNodes.flowNodeInstances && matchingFlowNodes.flowNodeInstances.length == 1) {
                    userTask = matchingFlowNodes.flowNodeInstances[0];

                    node.send({ payload: {userTask: userTask } });
                } else {
                    if (config.multisend) {
                        //matchingFlowNodes.forEach((userTask) => {
                        //    node.send({ payload: { userTask: userTask } });
                        //});
                    } else {
                        node.send({ payload: { userTasks: matchingFlowNodes } });
                    }
                 }
            });
        });
    }
    RED.nodes.registerType("usertask-input", UserTaskInput);
}