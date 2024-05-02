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

function mapUserTaskToMsg(userTask) {
    return userTask.userTaskConfig.formFields.map(field => {
        switch (field.type) {
            case 'string':
                return { id: field.id, type: 'text', required: false, label: field.label, value: '', title: 'Some helpful text' };
            case 'long':
                return { id: field.id, type: 'number', required: true, label: field.label, title: 'Some helpful text' };
            case 'date':
                return { id: field.id, type: 'date', required: true, label: field.label, title: 'Some helpful text' };
            case 'enum':
                return { id: field.id, type: 'select', required: true, label: field.label, options: field.enumValues.map(v => ({ id: v.id, name: v.name })), title: 'Choose an option' };
            case 'boolean':
                return { id: field.id, type: 'checkbox', required: false, label: field.label, title: 'Check for Yes' };
            default:
                return { id: field.id, type: field.type, required: true, label: field.label, title: 'Additional Information Needed' };
        }
    });
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

            // Abschließend mit - client.userTasks.finishUserTask(waitingUserTask?.flowNodeInstanceId, sampleResult)

            // flowNodeInstanceId
            // processModelName
            // flowNodeId
            client.userTasks.query({
                flowNodeInstanceId: userTaskWaitingNotification.flowNodeInstanceId,
                processModelId: userTaskWaitingNotification.processModelId,
                flowNodeId: userTaskWaitingNotification.flowNodeId,
            }).then((matchingFlowNodes) => {
                if (matchingFlowNodes && matchingFlowNodes.userTasks && matchingFlowNodes.userTasks.length == 1) {
                    userTask = matchingFlowNodes.userTasks[0];

                    let formFields = mapUserTaskToMsg(userTask);

                    let flowNodeInstanceId = { id: "_flowNodeInstanceId", type: "hidden", value: userTaskWaitingNotification.flowNodeInstanceId};
                    formFields.push(flowNodeInstanceId);

                    node.send({ payload: {formFields: formFields, userTask: userTask }});

                } else {
                    node.send({ payload: matchingFlowNodes });
                }
            });
        });
    }
    RED.nodes.registerType("usertask-input", UserTaskInput);
}