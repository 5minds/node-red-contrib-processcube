module.exports = function (RED) {
    function CheckAuthorization(config) {
        RED.nodes.createNode(this, config);
        const node = this;

        const claimsToCheck = (config.options || []).map((option) => option.claim);

        node.on('input', function (msg) {
            if (!msg._client || !msg._client.user || typeof msg._client.user.claims !== "object") {
                node.error("Invalid client claims in the input message", msg);
                return;
            }

            const userClaims = msg._client.user.claims;

            const isAuthorized = claimsToCheck.every((claim) => claim in userClaims);

            if (isAuthorized) {
                node.send([msg, undefined]);
            } else {
                node.send([undefined, msg]);
            }
        });
    }

    RED.nodes.registerType('check-authorization', CheckAuthorization);
};
