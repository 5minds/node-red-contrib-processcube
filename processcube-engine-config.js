const engine_client = require('@5minds/processcube_engine_client');
const jwt = require('jwt-decode');
const oidc = require('openid-client');

const DELAY_FACTOR = 0.85;

module.exports = function (RED) {
    function ProcessCubeEngineNode(n) {
        RED.nodes.createNode(this, n);
        const node = this;
        const identityChangedCallbacks = [];
        this.url = RED.util.evaluateNodeProperty(n.url, n.urlType, node);
        this.identity = null;

        this.credentials.clientId = RED.util.evaluateNodeProperty(n.clientId, n.clientIdType, node);
        this.credentials.clientSecret = RED.util.evaluateNodeProperty(n.clientSecret, n.clientSecretType, node);

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

        async function getFreshIdentity(url) {
            console.log('luis777');
            if (
                !RED.util.evaluateNodeProperty(n.clientId, n.clientIdType, node) ||
                !RED.util.evaluateNodeProperty(n.clientSecret, n.clientSecretType, node)
            )
                return null;
            const res = await fetch(url + '/atlas_engine/api/v1/authority', {
                method: 'GET',
                headers: {
                    Authorization: `Bearer ZHVtbXlfdG9rZW4=`,
                    'Content-Type': 'application/json',
                },
            });

            const issuer = await oidc.Issuer.discover(await res.json());

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

            configNode.setIdentity(freshIdentity);

            return freshIdentity;
        }

        node.on('close', async () => {
            if (this.engineClient) {
                this.engineClient.dispose();
                this.engineClient = null;
            }
        });

        if (this.credentials.clientId && this.credentials.clientSecret) {
            this.engineClient = new engine_client.EngineClient(this.url, () => getFreshIdentity(this.url));

            // this.engineClient.applicationInfo
            //     .getAuthorityAddress()
            //     .then((authorityUrl) => {
            //         startRefreshingIdentityCycle(
            //             this.credentials.clientId,
            //             this.credentials.clientSecret,
            //             authorityUrl,
            //             node
            //         ).catch((reason) => {
            //             console.error(reason);
            //             node.error(reason);
            //         });
            //     })
            //     .catch((reason) => {
            //         console.error(reason);
            //         node.error(reason);
            //     });
        } else {
            this.engineClient = new engine_client.EngineClient(this.url);
        }
    }
    RED.nodes.registerType('processcube-engine-config', ProcessCubeEngineNode, {
        credentials: {
            clientId: { type: 'text' },
            clientSecret: { type: 'password' },
        },
    });
};

// async function getFreshTokenSet(clientId, clientSecret, authorityUrl) {
//     const issuer = await oidc.Issuer.discover(authorityUrl);

//     const client = new issuer.Client({
//         client_id: clientId,
//         client_secret: clientSecret,
//     });

//     const tokenSet = await client.grant({
//         grant_type: 'client_credentials',
//         scope: 'engine_etw engine_read engine_write',
//     });

//     return tokenSet;
// }

// function getIdentityForExternalTaskWorkers(tokenSet) {
//     const accessToken = tokenSet.access_token;
//     const decodedToken = jwt.jwtDecode(accessToken);

//     return {
//         token: tokenSet.access_token,
//         userId: decodedToken.sub,
//     };
// }

// async function getExpiresInForExternalTaskWorkers(tokenSet) {
//     let expiresIn = tokenSet.expires_in;

//     if (!expiresIn && tokenSet.expires_at) {
//         expiresIn = Math.floor(tokenSet.expires_at - Date.now() / 1000);
//     }

//     if (expiresIn === undefined) {
//         throw new Error('Could not determine the time until the access token for external task workers expires');
//     }

//     return expiresIn;
// }

// /**
//  * Start refreshing the identity in regular intervals.
//  * @param {TokenSet | null} tokenSet The token set to refresh the identity for
//  * @returns {Promise<void>} A promise that resolves when the timer for refreshing the identity is initialized
//  * */
// async function startRefreshingIdentityCycle(clientId, clientSecret, authorityUrl, configNode) {
//     let retries = 5;

//     const refresh = async () => {
//         try {
//             const newTokenSet = await getFreshTokenSet(clientId, clientSecret, authorityUrl);
//             const expiresIn = await getExpiresInForExternalTaskWorkers(newTokenSet);
//             const delay = expiresIn * DELAY_FACTOR * 1000;

//             freshIdentity = getIdentityForExternalTaskWorkers(newTokenSet);

//             configNode.setIdentity(freshIdentity);

//             retries = 5;
//             setTimeout(refresh, delay);
//         } catch (error) {
//             if (retries === 0) {
//                 console.error(
//                     'Could not refresh identity for external task worker processes. Stopping all external task workers.',
//                     { error }
//                 );
//                 return;
//             }
//             console.error('Could not refresh identity for external task worker processes.', {
//                 error,
//                 retryCount: retries,
//             });
//             retries--;

//             const delay = 2 * 1000;
//             setTimeout(refresh, delay);
//         }
//     };

//     await refresh();
// }
