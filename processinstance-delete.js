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
            const modelId = msg.payload.processModelId
                ? msg.payload.processModelId != ''
                    ? msg.payload.processModelId
                    : undefined
                : config.modelid != ''
                ? config.modelid
                : undefined;

            try {
                const result = await client.processInstances.query({
                    processModelId: modelId
                }, { identity: engine.identity });

                let allInstances = result.processInstances.filter((instance) => instance.state != 'suspended' && instance.state != 'running');

                const today = new Date();

                const oldTasks = allInstances.filter((instance) => {
                    const finishedDate = new Date(instance.finishedAt);
                    const diffInHours = (today - finishedDate) / (1000 * 60 * 60);
                    return diffInHours > Number(timeToUse) * timeMultiplier;
                });

                const ids = oldTasks.map((obj) => obj.processInstanceId);

                // Änderungen: Fehler beim Löschen abfangen
                msg.payload = {
                    successfulDeletions: [],
                    failedDeletions: []
                };

                for (const id of ids) {
                    try {
                        await client.processInstances.deleteProcessInstances([id], true, engine.identity);
                        msg.payload.successfulDeletions.push(id); // Erfolgreiche IDs hinzufügen
                    } catch (deleteError) {
                        msg.payload.failedDeletions.push({ id, error: deleteError.message }); // Fehler protokollieren
                        node.warn(`Failed to delete process instance ID: ${id}. Error: ${deleteError.message}`);
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