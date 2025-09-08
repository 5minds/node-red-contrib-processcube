module.exports = function(RED) {
    const Imap = require('node-imap');
    const mailparser = require('mailparser');

    function EmailReceiverNode(config) {
        RED.nodes.createNode(this, config);
        const node = this;

        node.on('input', function(msg) {
            // Retrieve all values using the utility function
            const imap_host = RED.util.evaluateNodeProperty(config.host, config.hostType, node, msg);
            const imap_port = RED.util.evaluateNodeProperty(config.port, config.portType, node, msg);
            const imap_tls = RED.util.evaluateNodeProperty(config.tls, config.tlsType, node, msg);
            const imap_user = RED.util.evaluateNodeProperty(config.user, config.userType, node, msg);
            const imap_password = RED.util.evaluateNodeProperty(config.password, config.passwordType, node, msg);
            const imap_folder = RED.util.evaluateNodeProperty(config.folder, config.folderType, node, msg);
            const imap_markSeen = RED.util.evaluateNodeProperty(config.markseen, config.markseenType, node, msg);
            const encryptedPassword = RED.util.encrypt(imap_password);

            const finalConfig = {
                host: imap_host,
                port: (typeof imap_port === 'string') ? parseInt(imap_port, 10) : imap_port,
                tls: imap_tls,
                user: imap_user,
                password: encryptedPassword,
                folders: (Array.isArray(imap_folder)) ? imap_folder : imap_folder.split(',').map(f => f.trim()).filter(f => f.length > 0),
                markSeen: imap_markSeen,
                connTimeout: msg.imap_connTimeout || 10000,
                authTimeout: msg.imap_authTimeout || 5000,
                keepalive: msg.imap_keepalive !== undefined ? msg.imap_keepalive : true,
                autotls: msg.imap_autotls || 'never',
                tlsOptions: msg.imap_tlsOptions || { rejectUnauthorized: false }
            };

            if (!finalConfig.user || !finalConfig.password || !finalConfig.host) {
                node.status({ fill: 'red', shape: 'ring', text: 'missing IMAP config' });
                node.error('Missing required IMAP config (user, password, or host). Aborting.');
                return;
            }

            const fetchEmails = ({
                host,
                port,
                tls,
                user,
                password,
                folders,
                markSeen = true,
                connTimeout = 10000,
                authTimeout = 5000,
                keepalive = true,
                autotls = 'never',
                tlsOptions = { rejectUnauthorized: false }
            }, onMail) => {
                const imap = new Imap({
                    user,
                    password,
                    host,
                    port,
                    tls,
                    connTimeout,
                    authTimeout,
                    keepalive,
                    autotls,
                    tlsOptions
                });

                const state = {
                    total: folders.length,
                    processed: 0,
                    successes: 0,
                    failures: 0,
                    totalMails: 0,
                    errors: [],
                    fetchedPerFolder: {},
                };

                const updateStatus = (color, text) => {
                    node.status({ fill: color, shape: 'dot', text });
                };

                const finalizeStatus = () => {
                    if (state.failures === 0) {
                        updateStatus(
                            'green',
                            `Fetched ${state.totalMails} mails from ${state.successes} folder(s), done`
                        );
                    } else {
                        updateStatus(
                            'red',
                            `Fetched ${state.totalMails} mails from ${state.successes} of ${state.total} folder(s), ${state.failures} failed`
                        );
                    }
                };

                const fetchFromFolder = (folder, next) => {
                    updateStatus('yellow', `Fetching from ${folder}...`);

                    imap.openBox(folder, false, (err, box) => {
                        if (err) {
                            const msg = `Folder not found: ${folder}`;
                            node.error(msg);
                            state.failures += 1;
                            state.errors.push({ folder, error: err.message });
                            state.processed += 1;
                            return next();
                        }

                        imap.search(['UNSEEN'], (err, results) => {
                            if (err) {
                                node.error(`Search failed in folder "${folder}": ${err.message}`);
                                state.failures += 1;
                                state.errors.push({ folder, error: err.message });
                                state.processed += 1;
                                return next();
                            }

                            if (!results.length) {
                                state.fetchedPerFolder[folder] = 0;
                                state.successes += 1;
                                state.processed += 1;
                                return next();
                            }

                            state.fetchedPerFolder[folder] = results.length;
                            state.totalMails += results.length;

                            const fetch = imap.fetch(results, { bodies: '', markSeen });

                            fetch.on('message', msg => {
                                let buffer = '';
                                let attributes;

                                msg.on('body', stream => {
                                    stream.on('data', chunk => {
                                        buffer += chunk.toString('utf8');
                                    });
                                });

                                msg.once('attributes', attrs => {
                                    attributes = attrs;
                                });

                                msg.once('end', async () => {
                                    try {
                                        const parsed = await mailparser.simpleParser(buffer);
                                        const outMsg = {
                                            topic: parsed.subject,
                                            payload: parsed.text,
                                            html: parsed.html,
                                            from: parsed.replyTo?.text || parsed.from?.text,
                                            date: parsed.date,
                                            folder,
                                            header: parsed.headers,
                                            attachments: parsed.attachments.map(att => ({
                                                contentType: att.contentType,
                                                fileName: att.filename,
                                                transferEncoding: att.transferEncoding,
                                                contentDisposition: att.contentDisposition,
                                                generatedFileName: att.cid || att.checksum,
                                                contentId: att.cid,
                                                checksum: att.checksum,
                                                length: att.size,
                                                content: att.content
                                            }))
                                        };
                                        onMail(outMsg);
                                    } catch (err) {
                                        node.error(`Parse error in folder "${folder}": ${err.message}`);
                                        state.errors.push({ folder, error: 'parse failed' });
                                    }
                                });
                            });

                            fetch.once('error', err => {
                                node.error(`Fetch error in folder "${folder}": ${err.message}`);
                                state.errors.push({ folder, error: err.message });
                            });

                            fetch.once('end', () => {
                                state.successes += 1;
                                state.processed += 1;
                                next();
                            });
                        });
                    });
                };

                let folderQueue = [...folders];
                const nextFolder = () => {
                    if (folderQueue.length === 0) {
                        finalizeStatus();
                        imap.end();
                        return;
                    }
                    const folder = folderQueue.shift();
                    fetchFromFolder(folder, nextFolder);
                };

                imap.once('ready', () => {
                    nextFolder();
                });

                imap.once('error', err => {
                    node.status({ fill: 'red', shape: 'ring', text: 'imap connection error' });
                    node.error('IMAP error: ' + err.message);
                });

                updateStatus('yellow', 'Connecting to IMAP...');
                imap.connect();
            };

            fetchEmails(finalConfig, mail => {
                node.send(mail);
            });
        });
    }

    RED.nodes.registerType("email-receiver", EmailReceiverNode);
};