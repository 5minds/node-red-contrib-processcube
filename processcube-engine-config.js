const engine_client = require('@5minds/processcube_engine_client');
const jwt = require('jwt-decode');
const oidc = require('openid-client');

module.exports = function (RED) {
    function ProcessCubeEngineNode(n) {
        RED.nodes.createNode(this, n);
        const node = this;
        const identityChangedCallbacks = [];
        node.identity = null;

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

        if (node.credentials.clientId && node.credentials.clientSecret) {
            node.engineClient = new engine_client.EngineClient(node.url, {
                clientId: node.credentials.clientId,
                clientSecret: node.credentials.clientSecret,
            });
        } else {
            node.engineClient = new engine_client.EngineClient(node.url);
        }

        // async function getFreshIdentity(url, node) {
        //     try {
        //         if (
        //             !RED.util.evaluateNodeProperty(n.clientId, n.clientIdType, node) ||
        //             !RED.util.evaluateNodeProperty(n.clientSecret, n.clientSecretType, node)
        //         ) {
        //             return null;
        //         }

        //         const res = await fetch(url + '/atlas_engine/api/v1/authority', {
        //             method: 'GET',
        //             headers: {
        //                 Authorization: `Bearer ZHVtbXlfdG9rZW4=`,
        //                 'Content-Type': 'application/json',
        //             },
        //         });

        //         const body = await res.json();

        //         const issuer = await oidc.Issuer.discover(body);

        //         const client = new issuer.Client({
        //             client_id: RED.util.evaluateNodeProperty(n.clientId, n.clientIdType, node),
        //             client_secret: RED.util.evaluateNodeProperty(n.clientSecret, n.clientSecretType, node),
        //         });

        //         const tokenSet = await client.grant({
        //             grant_type: 'client_credentials',
        //             scope: 'engine_etw engine_read engine_write',
        //         });

        //         const accessToken = tokenSet.access_token;
        //         const decodedToken = jwt.jwtDecode(accessToken);

        //         const freshIdentity = {
        //             token: tokenSet.access_token,
        //             userId: decodedToken.sub,
        //         };

        //         node.setIdentity(freshIdentity);

        //         return freshIdentity;
        //     } catch (e) {
        //         node.error(`Could not get fresh identity: ${e}`);
        //     }
        // }

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
