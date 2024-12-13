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

        if (node.credentials.clientId && node.credentials.clientSecret) {
            node.engineClient = new engine_client.EngineClient(node.url, {
                clientId: node.credentials.clientId,
                clientSecret: node.credentials.clientSecret,
                scope: 'engine_etw engine_read engine_write',
            });
        } else {
            node.engineClient = new engine_client.EngineClient(node.url);
        }

        node.on('close', async () => {
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
