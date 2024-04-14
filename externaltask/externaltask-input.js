const process = require('process');

const engine_client = require('@5minds/processcube_engine_client');
const EventAggregator = require('./EventAggregator');

const engineUrl = process.env.ENGINE_URL || 'http://engine:8000';

const client = new engine_client.EngineClient(engineUrl);

module.exports = function(RED) {
    function ExternalTaskInput(config) {
        RED.nodes.createNode(this,config);
        var node = this;

        client.externalTasks.subscribeToExternalTaskTopic(
            config.topic,
            async (payload, externalTask) => {
                return await new Promise((resolve, reject) => {
                    EventAggregator.subscribeOnce(`finish-${externalTask.flowNodeInstanceId}`, (result) => {
                        resolve(result);
                    });

                    EventAggregator.subscribeOnce(`error-${externalTask.flowNodeInstanceId}`, (result) => {
                        reject(result);
                    });

                    var flowContext = this.context().flow;
                    flowContext.set('externalTaskId', externalTask.flowNodeInstanceId);

                    //node.send({ topic: externalTask.topic, payload: { externalTaskId: externalTask.flowNodeInstanceId, data: payload } });
                    node.send({ topic: externalTask.topic, externalTaskId: externalTask.flowNodeInstanceId, payload: payload});
                });
            },
          ).then(externalTaskWorker => externalTaskWorker.start());
    }
    RED.nodes.registerType("externaltask-input", ExternalTaskInput);
}