module.exports = function (RED) {
    function ProcessInstanceDelete(config) {
        RED.nodes.createNode(this, config);
        const node = this;

        node.on('input', async function (msg) {
            node.engine = RED.nodes.getNode(config.engine);
            const client = node.engine ? node.engine.engineClient : null;

            if (!client || !client.processInstances) {
                node.error('No engine or processInstances API configured.');
                return;
            }

            const timeToUse = msg.payload.duration || config.duration;
            if (!timeToUse || isNaN(timeToUse) || timeToUse <= 0) {
                node.error('Invalid duration: must be a positive number.');
                return;
            }

            // Gültige Werte für time_type
            const validTimeTypes = ['days', 'hours'];
            const timeType = msg.payload.time_type
                ? msg.payload.time_type.toLowerCase()
                : config.time_type?.toLowerCase();

            // time_type validieren
            if (!timeType || !validTimeTypes.includes(timeType)) {
                node.error(`Invalid time_type provided: ${timeType}. Allowed values are 'days' or 'hours'.`);
                return;
            }

            // Zeitmultiplikator berechnen
            const multiplier = timeType === 'hours' ? 1 : 24;
            node.log(`Time type: ${timeType}, multiplier: ${multiplier}`);

            const deletionDate = new Date(Date.now() - timeToUse * multiplier * 60 * 60 * 1000);
            node.log(`Calculated deletion date: ${deletionDate}`);

            const modelId = msg.payload.processModelId?.trim() || config.modelid?.trim();
            if (!modelId) {
                node.error('processModelId is not defined or empty.');
                return;
            }

            // Prüfung und Festlegung von batch_size
            let batchSize = msg.payload.batch_size || config.batch_size || 1000;
            if (isNaN(batchSize) || batchSize <= 0 || batchSize > 1000) {
                node.error(`Invalid batch_size: ${batchSize}. Must be a positive number and not exceed 1000.`);
                return;
            }
            batchSize = Math.min(batchSize, 1000); // Sicherstellen, dass der Wert 1000 nicht überschreitet

            try {
                msg.payload = { successfulDeletions: [], failedDeletions: [] };

                let hasMoreResults = true;

                while (hasMoreResults) {
                    const result = await client.processInstances.query(
                        {
                            processModelId: modelId,
                            finishedBefore: deletionDate.toISOString(),
                            state: ['finished', 'error', 'terminated'],
                            limit: batchSize,
                        },
                        { includeXml: false }
                    );

                    const processInstances = result.processInstances || [];
                    if (processInstances.length === 0) {
                        node.log(`No more process instances to delete for Model-ID: ${modelId} with Date: ${deletionDate.toISOString()}`);
                        hasMoreResults = false;
                        continue;
                    }

                    const ids = processInstances.map((obj) => obj.processInstanceId);

                    try {
                        await client.processInstances.deleteProcessInstances(ids, true);
                        msg.payload.successfulDeletions.push(...ids);
                        node.log(`Successfully deleted ${ids.length} process instances.`);
                    } catch (deleteError) {
                        var message = JSON.stringify(deleteError);
                        ids.forEach((id) => {
                            msg.payload.failedDeletions.push({ id, error: message });
                        });
                        node.warn(`Failed to delete some process instances for Model-ID: ${modelId}. Error: ${message}`);
                    }
                }

                node.send(msg);
            } catch (queryError) {
                node.error(`Failed to query process instances for Model-ID: ${modelId}. Error: ${queryError.message}`);
            }
        });
    }

    RED.nodes.registerType('processinstance-delete', ProcessInstanceDelete);
};
