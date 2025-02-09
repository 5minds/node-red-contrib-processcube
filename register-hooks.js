module.exports = function (RED) {
    RED.myprop = 'Hello World';

    RED.hooks.add("onSend", (sendEvents) => {
        const source = sendEvents[0].source;
        const msg = sendEvents[0].msg;

        if (source.node.type == 'externaltask-input') {
            source.node.log(`ExternalTask send _msgid: ${msg._msgid}`);
        }
    });

    RED.hooks.add("onReceive", (receiveEvent) => {
        console.log(`Message about to be passed to node: ${receiveEvent.destination.id}`);

        const currentNodeId = receiveEvent.destination.id
        const node = RED.nodes.getNode(currentNodeId);


        if (currentNodeId === "a1ff60cf666c101a") {

            node.send({ payload: 'aber es kommt trotzdem eine response! :)'});
            return false;
        }

        return true;
    });
};