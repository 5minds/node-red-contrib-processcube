const engine_client = require('@5minds/processcube_engine_client');
const jwt = require('jwt-decode');
const oidc = require('openid-client');

module.exports = function (RED) {
    function ProcessCubeEngineNode(n) {
        RED.nodes.createNode(this, n);
        const node = this;

        node.url = RED.util.evaluateNodeProperty(n.url, n.urlType, node);
        node.credentials.clientId = RED.util.evaluateNodeProperty(n.clientId, n.clientIdType, node);
        node.credentials.clientSecret = RED.util.evaluateNodeProperty(n.clientSecret, n.clientSecretType, node);

        try {
            if (node.credentials.clientId && node.credentials.clientSecret) {
                node.log('Create Client with secrets');
                node.engineClient = new engine_client.EngineClient(node.url, {
                    clientId: node.credentials.clientId,
                    clientSecret: node.credentials.clientSecret,
                    scope: 'engine_etw engine_read engine_write',
                });
            } else {
                node.log('Create Client without secrets');
                node.engineClient = new engine_client.EngineClient(node.url);
            }
        } catch (error) {
            node.error(error);
        }

        node.on('close', async () => {
            node.log('close');
            if (node.engineClient) {
                node.engineClient.dispose();
                node.engineClient = null;
            }
        });
    }

    RED.nodes.registerType('processcube-engine-config', ProcessCubeEngineNode, {
        credentials: {
            clientId: { type: 'text' },
            clientSecret: { type: 'password' },
        },
    });
};
