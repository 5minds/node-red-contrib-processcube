module.exports = function(RED) {
    function ExternalTaskError(config) {
        RED.nodes.createNode(this,config);
        var node = this;

        var flowContext = node.context().flow;
        var eventEmitter = flowContext.get('emitter');       

        node.on('input', function(msg) {

            const externalTaskId = msg.externalTaskId;

            let msgError = msg.error;

            if (msgError === undefined) {
                msgError.message = "An error occurred";
            }

            msg.errorCode = config.error;
            msg.errorMessage = msgError.message;
            //msg.errorDetails = RED.util.encodeObject(msg); // circular structure

            const error = new Error(msg.errorMessage);
            error.errorCode = msg.errorCode;
            error.errorDetails = RED.util.encodeObject(msg);
            
            // TODO: hack cause https://github.com/5minds/ProcessCube.Engine.Client.ts/blob/develop/src/ExternalTaskWorker.ts#L180
            error.stack = error.errorDetails; 
            error.externalTaskId = externalTaskId;
            error._msgid = msg._msgid;

            eventEmitter.emit(`handle-${externalTaskId}`, error, true);
            
            node.send(msg);
        });     
    }
    RED.nodes.registerType("externaltask-error", ExternalTaskError);
}