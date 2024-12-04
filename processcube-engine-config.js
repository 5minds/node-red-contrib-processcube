const EventEmitter = require('node:events');
const engine_client = require('@5minds/processcube_engine_client');
const jwt = require('jwt-decode');
const oidc = require('openid-client');

module.exports = function (RED) {
    function ProcessCubeEngineNode(n) {
        RED.nodes.createNode(this, n);
        const node = this;
        const identityChangedCallbacks = [];
        this.identity = null;

        this.credentials.clientId = RED.util.evaluateNodeProperty(n.clientId, n.clientIdType, node);
        this.credentials.clientSecret = RED.util.evaluateNodeProperty(n.clientSecret, n.clientSecretType, node);

        node.eventEmitter = new EventEmitter();

        // set the engine url
        const stopRefreshing = periodicallyRefreshEngineClient(this, n, 10000);

        this.registerOnIdentityChanged = function (callback) {
            identityChangedCallbacks.push(callback);
        };

        this.isIdentityReady = function () {
            if (this.credentials.clientId && this.credentials.clientSecret) {
                return this.identity != null;
            } else {
                return true;
            }
        };

        this.setIdentity = (identity) => {
            node.log(`setIdentity: ${JSON.stringify(identity)}`);
            this.identity = identity;

            for (const callback of identityChangedCallbacks) {
                callback(identity);
            }
        };

        function periodicallyRefreshEngineClient(node, n, intervalMs) {
            function refreshUrl() {
                const newUrl = RED.util.evaluateNodeProperty(n.url, n.urlType, node);
                const newClientId = RED.util.evaluateNodeProperty(n.clientId, n.clientIdType, node);
                const newClientSecret = RED.util.evaluateNodeProperty(n.clientSecret, n.clientSecretType, node);

                if (
                    node.url === newUrl &&
                    node.credentials.clientId === newClientId &&
                    node.credentials.clientSecret === newClientSecret
                ) {
                    return;
                }

                node.url = newUrl;
                node.credentials.clientId = newClientId;
                node.credentials.clientSecret = newClientSecret;

                if (node.credentials.clientId && node.credentials.clientSecret) {
                    if (node.engineClient) {
                        node.eventEmitter.emit('engine-client-dispose');
                        node.engineClient.dispose();
                    }
                    node.engineClient = new engine_client.EngineClient(node.url, () =>
                        getFreshIdentity(node.url, node)
                    );

                    node.eventEmitter.emit('engine-client-changed');
                } else {
                    if (node.engineClient) {
                        node.eventEmitter.emit('engine-client-dispose');
                        node.engineClient.dispose();
                    }
                    node.engineClient = new engine_client.EngineClient(node.url);

                    node.eventEmitter.emit('engine-client-changed');
                }
            }

            refreshUrl();
            const intervalId = setInterval(refreshUrl, intervalMs);

            return () => clearInterval(intervalId);
        }

        async function getFreshIdentity(url, node) {
            try {
                if (
                    !RED.util.evaluateNodeProperty(n.clientId, n.clientIdType, node) ||
                    !RED.util.evaluateNodeProperty(n.clientSecret, n.clientSecretType, node)
                ) {
                    return null;
                }

                const res = await fetch(url + '/atlas_engine/api/v1/authority', {
                    method: 'GET',
                    headers: {
                        Authorization: `Bearer ZHVtbXlfdG9rZW4=`,
                        'Content-Type': 'application/json',
                    },
                });

                const body = await res.json();

                const issuer = await oidc.Issuer.discover(body);

                const client = new issuer.Client({
                    client_id: RED.util.evaluateNodeProperty(n.clientId, n.clientIdType, node),
                    client_secret: RED.util.evaluateNodeProperty(n.clientSecret, n.clientSecretType, node),
                });

                const tokenSet = await client.grant({
                    grant_type: 'client_credentials',
                    scope: 'engine_etw engine_read engine_write',
                });

                const accessToken = tokenSet.access_token;
                const decodedToken = jwt.jwtDecode(accessToken);

                const freshIdentity = {
                    token: tokenSet.access_token,
                    userId: decodedToken.sub,
                };

                node.setIdentity(freshIdentity);

                return freshIdentity;
            } catch (e) {
                node.error(`Could not get fresh identity: ${JSON.stringify(e)}`);
            }
        }

        node.on('close', async () => {
            if (this.engineClient) {
                stopRefreshing();
                this.engineClient.dispose();
                this.engineClient = null;
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
