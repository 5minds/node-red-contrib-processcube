const process = require('process');
const EventEmitter = require('node:events');

const engine_client = require('@5minds/processcube_engine_client');

module.exports = function(RED) {
    function UserTaskFinishedListener(config) {
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

        const register = async () => {
            let currentIdentity = node.server.identity;
            let subscription = await client.userTasks.onUserTaskFinished((userTaskFinishedNotification) => {
                node.send({ payload: { flowNodeInstanceId: userTaskFinishedNotification.flowNodeInstanceId, action: "finished", type: "usertask" } });
            }, { identity: currentIdentity });
            
            node.server.registerOnIdentityChanged(async (identity) => {  
                client.userTasks.removeSubscription(subscription, currentIdentity);
                currentIdentity = identity;
    
                subscription = await client.userTasks.onUserTaskFinished((userTaskFinishedNotification) => {
                    node.send({ payload: { flowNodeInstanceId: userTaskFinishedNotification.flowNodeInstanceId, action: "finished", type: "usertask" } });
                }, { identity: currentIdentity });
            });
    
            node.on("close", async () => {
                client.userTasks.removeSubscription(subscription, currentIdentity);
                client.dispose();
                client = null;
            });
        } 

        register();
    }
    RED.nodes.registerType("usertask-finished-listener", UserTaskFinishedListener);
}