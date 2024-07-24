const EventEmitter = require("node:events");

module.exports = function (RED) {
    function UserTaskNewListener(config) {
        RED.nodes.createNode(this, config);
        var node = this;
        var flowContext = node.context().flow;

        this.engine = this.server = RED.nodes.getNode(config.engine);

        const client = this.engine.getEngineClient();

        var eventEmitter = flowContext.get("emitter");

        if (!eventEmitter) {
            flowContext.set("emitter", new EventEmitter());
            eventEmitter = flowContext.get("emitter");
        }

        const register = async () => {
            let currentIdentity = node.server.identity;
            let subscription = await client.userTasks.onUserTaskWaiting(
                (userTaskWaitingNotification) => {
                    node.send({
                        payload: {
                            flowNodeInstanceId: userTaskWaitingNotification.flowNodeInstanceId,
                            action: 'new',
                            type: 'usertask',
                        },
                    });
                },
                { identity: currentIdentity },
            );

            node.server.registerOnIdentityChanged(async (identity) => {
                client.userTasks.removeSubscription(subscription, currentIdentity);
                currentIdentity = identity;

                subscription = await client.userTasks.onUserTaskWaiting(
                    (userTaskWaitingNotification) => {
                        node.send({
                            payload: {
                                flowNodeInstanceId: userTaskWaitingNotification.flowNodeInstanceId,
                                action: 'new',
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
    RED.nodes.registerType('usertask-new-listener', UserTaskNewListener);
};
