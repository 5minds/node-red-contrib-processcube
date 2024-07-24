const process = require('process');
const EventEmitter = require('node:events');

const engine_client = require('@5minds/processcube_engine_client');

module.exports = function (RED) {
    function UserTaskFinishedListener(config) {
        RED.nodes.createNode(this, config);
        var node = this;
        var flowContext = node.context().flow;

        this.engine = this.server = RED.nodes.getNode(config.engine);

        const client = this.engine.getEngineClient();

        var eventEmitter = flowContext.get('emitter');

        if (!eventEmitter) {
            flowContext.set('emitter', new EventEmitter());
            eventEmitter = flowContext.get('emitter');
        }

        const register = async () => {
            let currentIdentity = node.server.identity;
            let subscription = await client.userTasks.onUserTaskFinished(
                (userTaskFinishedNotification) => {
                    node.send({
                        payload: {
                            flowNodeInstanceId: userTaskFinishedNotification.flowNodeInstanceId,
                            action: 'finished',
                            type: 'usertask',
                        },
                    });
                },
                { identity: currentIdentity },
            );

            node.server.registerOnIdentityChanged(async (identity) => {
                client.userTasks.removeSubscription(subscription, currentIdentity);
                currentIdentity = identity;

                subscription = await client.userTasks.onUserTaskFinished(
                    (userTaskFinishedNotification) => {
                        node.send({
                            payload: {
                                flowNodeInstanceId: userTaskFinishedNotification.flowNodeInstanceId,
                                action: 'finished',
                                type: 'usertask',
                            },
                        });
                    },
                    { identity: currentIdentity },
                );
            });

            node.on('close', async () => {
                client.userTasks.removeSubscription(subscription, currentIdentity);
                client.dispose();
                client = null;
            });
        };

        if (node.server) {
            register();
        }
    }
    RED.nodes.registerType('usertask-finished-listener', UserTaskFinishedListener);
};
