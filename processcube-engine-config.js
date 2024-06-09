module.exports = function(RED) {
    function ProcessCubeEngineNode(n) {
        RED.nodes.createNode(this, n);
        this.url = n.url;
    }
    RED.nodes.registerType("processcube-engine-config", ProcessCubeEngineNode);
}