module.exports = function (RED) {
    function ProcessInstanceDelete(config) {
        RED.nodes.createNode(this, config);
        var node = this;

        node.on('input', async function (msg) {
            const engine = RED.nodes.getNode(config.engine);
            const client = engine.engineClient;

            if (!client) {
                node.error('No engine configured.');
                return;
            }
            let timeMultiplier;
            if (msg.payload.time_type) {
                timeMultiplier = msg.payload.time_type == 'hours' ? 1 : 24;
            } else {
                timeMultiplier = config.time_type == 'hours' ? 1 : 24;
            }

            const timeToUse = msg.payload.time ? msg.payload.time : config.time;

            try {
                const fetchInstancesByState = async (state) => {
                    const result = await client.processInstances.query({ state });
                    return result.processInstances;
                };

                const finishedInstances = await fetchInstancesByState('finished');
                const terminatedInstances = await fetchInstancesByState('terminated');
                const errorInstances = await fetchInstancesByState('error');

                let allInstances = [...finishedInstances, ...terminatedInstances, ...errorInstances];

                const today = new Date();

                const oldTasks = allInstances.filter((instance) => {
                    const finishedDate = new Date(instance.finishedAt);
                    const diffInHours = (today - finishedDate) / (1000 * 60 * 60);
                    return diffInHours > Number(timeToUse) * timeMultiplier;
                });

                const ids = oldTasks.map((obj) => obj.processInstanceId);
                msg.payload = ids;

                await client.processInstances.deleteProcessInstances(ids, engine.identity);
                node.send(msg);
            } catch (error) {
                node.error(error);
            }
        });
    }

    RED.nodes.registerType('processinstance-delete', ProcessInstanceDelete);
};
