module.exports = function (RED) {
    RED.myprop = 'Hello World';

    RED.hooks.add("onSend", (sendEvents) => {
        const source = sendEvents[0].source;
        const msg = sendEvents[0].msg;

        if (source.node.type == 'externaltask-input') {
            source.node.log(`ExternalTask send _msgid: ${msg._msgid}`);
        }
    });
};