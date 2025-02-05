module.exports = function (RED) {
    function ProcessInstanceDelete(config) {
        RED.nodes.createNode(this, config);
        const node = this;

        node.on('input', async function (msg) {
            node.engine = RED.nodes.getNode(config.engine);
            const client = node.engine ? node.engine.engineClient : null;

            const isUser = !!msg._client?.user && !!msg._client.user.accessToken;
            const userIdentity = isUser ? { userId: msg._client.user.id, token: msg._client.user.accessToken } : null;

            if (!client || !client.processInstances) {
                node.error('No engine or processInstances API configured.', msg);
                return;
            }

            const timeToUse = msg.payload.duration || config.duration;
            if (!timeToUse || isNaN(timeToUse) || timeToUse <= 0) {
                node.error('Invalid duration: must be a positive number.', msg);
                return;
            }

            // Gültige Werte für time_type
            const validTimeTypes = ['days', 'hours'];
            const timeType = msg.payload.time_type
                ? msg.payload.time_type.toLowerCase()
                : config.time_type?.toLowerCase();

            // time_type validieren
            if (!timeType || !validTimeTypes.includes(timeType)) {
                node.error(`Invalid time_type provided: ${timeType}. Allowed values are 'days' or 'hours'.`, msg);
                return;
            }

            // Zeitmultiplikator berechnen
            const multiplier = timeType === 'hours' ? 1 : 24;
            node.log(`Time type: ${timeType}`);

            const deletionDate = new Date(Date.now() - timeToUse * multiplier * 60 * 60 * 1000);            

            const modelId = msg.payload.processModelId?.trim() || config.modelid?.trim();
            if (!modelId) {
                node.error('processModelId is not defined or empty.', msg);
                return;
            }

            // Prüfung und Festlegung von batch_size
            let batchSize = msg.payload.batch_size || config.batch_size || 1000;
            if (isNaN(batchSize) || batchSize <= 0 || batchSize > 1000) {
                node.error(`Invalid batch_size: ${batchSize}. Must be a positive number and not exceed 1000.`, msg);
                return;
            }
            batchSize = Math.min(batchSize, 1000); // Sicherstellen, dass der Wert 1000 nicht überschreitet

            try {
                msg.payload = { successfulDeletions: [], failedDeletions: [] };

                let hasMoreResults = true;
                let sumSuccessful = 0;
                let sumFailed = 0;
                while (hasMoreResults) {
                    const result = await client.processInstances.query(
                        {
                            processModelId: modelId,
                            finishedBefore: deletionDate.toISOString(),
                            state: ['finished', 'error', 'terminated'],
                            limit: batchSize,
                        },
                        { 
                            includeXml: false,
                            identity: userIdentity
                        }
                    );

                    const processInstances = result.processInstances || [];
                    if (processInstances.length === 0) {
                        node.log(`No more process instances to delete for Model-ID: ${modelId} with Date: ${deletionDate.toISOString()}`, msg);
                        hasMoreResults = false;
                        continue;
                    }

                    const ids = processInstances.map((obj) => obj.processInstanceId);

                    try {
                        await client.processInstances.deleteProcessInstances(ids, true, userIdentity);
                        msg.payload.successfulDeletions.push(...ids);
                        sumSuccessful += ids.length;                         
                    } catch (deleteError) {
                        var message = JSON.stringify(deleteError);
                        sumFailed += ids.length;
                        ids.forEach((id) => {
                            msg.payload.failedDeletions.push({ id, error: message });
                        });
                        node.warn(`Failed to delete some process instances for Model-ID: ${modelId}. Error: ${message}`);
                    }
                }
                node.log(`Successfully deleted ${sumSuccessful} process instances and ${sumFailed} failed to delete process instances for Model-ID: ${modelId}.`);


                node.send(msg);
            } catch (queryError) {
                node.error(`Failed to query process instances for Model-ID: ${modelId}. Error: ${queryError.message}`, msg);
            }
        });
    }

    RED.nodes.registerType('processinstance-delete', ProcessInstanceDelete);
};
