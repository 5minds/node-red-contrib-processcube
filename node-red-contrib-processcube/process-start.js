const process = require('process');

const engine_client = require('@5minds/processcube_engine_client');
const EventAggregator = require('./EventAggregator');
const { notDeepStrictEqual } = require('assert');

const engineUrl = process.env.ENGINE_URL || 'http://engine:8000';

const client = new engine_client.EngineClient(engineUrl);

module.exports = function(RED) {
    function ProcessStart(config) {
        RED.nodes.createNode(this,config);
        var node = this;

        node.on('input', function(msg) {
            client.processDefinitions.startProcessInstance({
                processModelId: config.processmodel,
                startEventId: config.startevent,
                initialToken: msg.payload
            }).then((result) => {
                node.send({payload: result});
                node.status({fill: "blue", shape: "dot", text: `started ${result.processInstanceId}`});
            }).catch((error) => {
                node.error(error);
            });
        });
    }
    RED.nodes.registerType("process-start", ProcessStart);
}