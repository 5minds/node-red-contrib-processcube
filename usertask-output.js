const process = require('process');
const EventEmitter = require('node:events');

const engine_client = require('@5minds/processcube_engine_client');

module.exports = function(RED) {
    function UserTaskOutput(config) {

        RED.nodes.createNode(this, config);

        var node = this;
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

        node.on('input', function(msg) {
            console.log(`Try to finsih UserTask with id ${msg.payload._flowNodeInstanceId}.`);

            const flowNodeInstanceId = msg.payload._flowNodeInstanceId;

            client.userTasks.finishUserTask(flowNodeInstanceId, msg.payload).then(() => {
                console.log(`UserTask with id ${flowNodeInstanceId} finished.`);
            });
        });     
    }

    RED.nodes.registerType("usertask-output", UserTaskOutput);
}