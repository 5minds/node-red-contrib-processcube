const engine_client = require('@5minds/processcube_engine_client');
const jwt = require('jwt-decode');
const oidc = require('openid-client');

module.exports = function (RED) {
    function ProcessCubeEngineNode(n) {
        RED.nodes.createNode(this, n);
        const node = this;
        const identityChangedCallbacks = [];
        node.identity = null;

        node.url = RED.util.evaluateNodeProperty(n.url, n.urlType, node);

        node.credentials.clientId = RED.util.evaluateNodeProperty(n.clientId, n.clientIdType, node);
        node.credentials.clientSecret = RED.util.evaluateNodeProperty(n.clientSecret, n.clientSecretType, node);

        node.registerOnIdentityChanged = function (callback) {
            identityChangedCallbacks.push(callback);
        };

        node.isIdentityReady = function () {
            if (node.credentials.clientId && node.credentials.clientSecret) {
                return node.identity != null;
            } else {
                return true;
            }
        };

        node.setIdentity = (identity) => {
            node.log(`setIdentity: ${JSON.stringify(identity)}`);
            node.identity = identity;

            for (const callback of identityChangedCallbacks) {
                callback(identity);
            }
        };

        node.log(`luis555: ${node.url}`)

        if (node.credentials.clientId && node.credentials.clientSecret) {
            node.log("luis777")
            node.engineClient = new engine_client.EngineClient(node.url, {
                clientId: node.credentials.clientId,
                clientSecret: node.credentials.clientSecret,
                scope: 'engine_etw engine_read engine_write'
            });
        } else {
            node.log("luis999")
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
