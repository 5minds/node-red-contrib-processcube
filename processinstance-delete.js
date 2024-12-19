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

            const isHours = msg.payload.time_unit
                ? msg.payload.time_unit.toLowerCase() === 'hours'
                : config.time_unit.toLowerCase() === 'hours';
            const multiplier = isHours ? 1 : 24;

            const deletionDate = new Date(Date.now() - timeToUse * multiplier * 60 * 60 * 1000);

            const modelId = msg.payload.processModelId?.trim() || config.modelid?.trim();
            if (!modelId) {
                node.error('processModelId is not defined or empty.');
                return;
            }

            const batchSize = config.batch_size || 100;

            try {
                const result = await client.processInstances.query(
                    { processModelId: modelId, 
                      finishedBefore: deletionDate,
                      state: ['finished', 'error', 'terminated'],
                     },
                    { identity: node.engine.identity }
                );

                if (result.length === 0) {
                    node.log('No process instances to delete.');
                    node.send(msg);
                    return;
                }

                const ids = result.processInstances.map((obj) => obj.processInstanceId);

                msg.payload = { successfulDeletions: [], failedDeletions: [] };

                for (let i = 0; i < ids.length; i += batchSize) {
                    const batch = ids.slice(i, i + batchSize);
                    try {
                        await client.processInstances.deleteProcessInstances(batch, true, node.engine.identity);
                        msg.payload.successfulDeletions.push(...batch);
                    } catch (deleteError) {
                        batch.forEach((id) => {
                            msg.payload.failedDeletions.push({ id, error: deleteError.message });
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