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

        client.userTasks.onUserTaskWaiting((userTaskWaitingNotification) => {
            console.log(`UserTask with id ${userTaskWaitingNotification.flowNodeInstanceId} is waiting.`);

            // processModelName
            // flowNodeId
            client.userTasks.query({
                flowNodeInstanceId: userTaskWaitingNotification.flowNodeInstanceId,
                processModelId: userTaskWaitingNotification.processModelId,
                flowNodeId: userTaskWaitingNotification.flowNodeId,
            }).then((matchingFlowNodes) => {
                node.send({ payload: matchingFlowNodes });
            });

        });
    }
    RED.nodes.registerType("usertask-input", UserTaskInput);
}