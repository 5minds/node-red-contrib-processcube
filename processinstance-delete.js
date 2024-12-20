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
            node.log(`Errechnetes Datum: ${deletionDate}`);
            const modelId = msg.payload.processModelId?.trim() || config.modelid?.trim();
            
            if (!modelId) {
                node.error('processModelId is not defined or empty.');
                return;
            }

            const batchSize = msg.payload.batch_size || config.batch_size;

            try {
                const result = await client.processInstances.query(
                    {                           
                        processModelId: modelId,
                        includeXml: false, 
                        finishedBefore: deletionDate.toISOString(),
                        state: ["finished", "error", "terminated"],
                     }
                );

                if (result.processInstances.length === 0) {
                    node.log(`No process instances to delete for Model-ID: ${modelId} and given Date: ${deletionDate.toISOString()}`);
                    node.send(msg);
                    return;
                }

                const ids = result.processInstances.map((obj) => obj.processInstanceId);

                msg.payload = { successfulDeletions: [], failedDeletions: [] };

                for (let i = 0; i < ids.length; i += batchSize) {
                    var batch = ids.slice(i, i + batchSize);
                    try 
                    {
                        await client.processInstances.deleteProcessInstances(batch, true, node.engine.identity);
                        msg.payload.successfulDeletions.push(...batch);
                    } 
                    catch (deleteError) 
                    {
                        batch.forEach((id) => {msg.payload.failedDeletions.push({ id, error: deleteError.message });});
                        node.warn(`Failed to delete process instances in batch for Model-ID: ${modelId}: ${batch.join(', ')}. Error: ${deleteError.message}`);
                    }
                }

                node.send(msg);
            } catch (queryError) {
                node.error(`Failed to query process instances for Model-ID: ${modelId}: ${queryError.message}`);
            }
        });
    }

    RED.nodes.registerType('processinstance-delete', ProcessInstanceDelete);
};