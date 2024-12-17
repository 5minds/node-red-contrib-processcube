module.exports = function (RED) {
    function ProcessInstanceDelete(config) {
        RED.nodes.createNode(this, config);
        var node = this;

        node.on('input', async function (msg) {
            node.engine = RED.nodes.getNode(config.engine);
            const client = node.engine.engineClient;

            if (!client) {
                node.error('No engine configured.');
                return;
            }

            let timeMultiplier;
            if (msg.payload.time_unit) {
                timeMultiplier = msg.payload.time_unit == 'hours' ? 1 : 24;
            } else {
                timeMultiplier = config.time_unit == 'hours' ? 1 : 24;
            }

            const timeToUse = msg.payload.duration ? msg.payload.duration : config.duration;
            const modelId = msg.payload.processModelId
                ? msg.payload.processModelId != ''
                    ? msg.payload.processModelId
                    : undefined
                : config.modelid != ''
                ? config.modelid
                : undefined;

            const batchSize = config.batch_size || 100; // Konfigurierbare Batchgröße, Standardwert 100

            try {
                const result = await client.processInstances.query({
                    processModelId: modelId
                }, { identity: node.engine.identity });

                let allInstances = result.processInstances.filter((instance) => instance.state != 'suspended' && instance.state != 'running');

                const today = new Date();

                const oldTasks = allInstances.filter((instance) => {
                    const finishedDate = new Date(instance.finishedAt);
                    const diffInHours = (today - finishedDate) / (1000 * 60 * 60);
                    return diffInHours > Number(timeToUse) * timeMultiplier;
                });

                const ids = oldTasks.map((obj) => obj.processInstanceId);

                msg.payload = {
                    successfulDeletions: [],
                    failedDeletions: []
                };

                for (let i = 0; i < ids.length; i += batchSize) {
                    const batch = ids.slice(i, i + batchSize);
                    try {
                        await client.processInstances.deleteProcessInstances(batch, true, engine.identity);
                        msg.payload.successfulDeletions.push(...batch); // Erfolgreiche IDs hinzufügen
                    } catch (deleteError) {
                        batch.forEach(id => {
                            msg.payload.failedDeletions.push({ id, error: deleteError.message }); // Fehler protokollieren
                        });
                        node.warn(`Failed to delete process instances in batch: ${batch.join(', ')}. Error: ${deleteError.message}`);
                    }
                }
                node.send(msg);
            } catch (queryError) {
                node.error(`Failed to query process instances: ${queryError.message}`);
            }
        });
    }

    RED.nodes.registerType('processinstance-delete', ProcessInstanceDelete);
};
