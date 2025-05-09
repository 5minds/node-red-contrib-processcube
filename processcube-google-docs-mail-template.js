module.exports = function (RED) {

    const fs = require('fs');
    const path = require('path');
    const os = require('os');
    const { pipeline } = require('stream');
    const { promisify } = require('util');
    const AdmZip = require('adm-zip');

    const streamPipeline = promisify(pipeline);

    function ProcesssCubeGoogleDocsMailTemplate(config) {
        RED.nodes.createNode(this, config);
        const node = this;

        const template_link = config.template_link;

        node.on('input', async function (msg) {

            try {

                function renderTemplate(html, payload) {
                    // Ersetze {{feld}} und ///feld///
                    return html.replace(/({{([^}]+)}}|\/\/\/([^/]+)\/\/\/)/g, (match, _, field1, field2) => {
                        const key = field1 || field2;
                        return payload[key.trim()] ?? match; // fallback: Platzhalter bleibt bestehen
                    });
                }

                function removeGoogleRedirects(html) {
                    return html.replace(/https:\/\/www\.google\.com\/url\?q=([^"&]+)[^"]*/g, (match, actualUrl) => {
                        try {
                            // Google-URLs sind URL-encoded – dekodieren
                            return decodeURIComponent(actualUrl);
                        } catch {
                            return actualUrl;
                        }
                    });
                }

                const customRoot = path.resolve(RED.settings.userDir, 'tmp/processcube-google-docs-mail-template');
                fs.mkdirSync(customRoot, { recursive: true });
                const tempDir = fs.mkdtempSync(path.join(customRoot, 'run-'));
                const zipPath = path.join(tempDir, 'downloaded.zip');

                const url = template_link;
                console.log('Lade ZIP-Datei...');
                const response = await fetch(url);
                if (!response.ok) {
                    throw new Error(`Fehler beim Herunterladen: ${response.status} ${response.statusText}`);
                }
                await streamPipeline(response.body, fs.createWriteStream(zipPath));

                console.log('Entpacke ZIP...');
                const zip = new AdmZip(zipPath);
                zip.extractAllTo(tempDir, true);

                // === HTML-Datei im obersten Verzeichnis finden ===
                const topLevelFiles = fs.readdirSync(tempDir, { withFileTypes: true });
                const htmlEntry = topLevelFiles.find(file =>
                    file.isFile() && file.name.toLowerCase().endsWith('.html')
                );

                if (!htmlEntry) {
                    throw new Error('Keine HTML-Datei im ZIP-Hauptverzeichnis gefunden.');
                }

                const htmlPath = path.join(tempDir, htmlEntry.name);
                let html = fs.readFileSync(htmlPath, 'utf8');

                // === Bilder durch CID ersetzen ===
                const imgRegex = /src="images\/([^"]+)"/g;
                const attachments = [];
                let match;

                while ((match = imgRegex.exec(html)) !== null) {
                    const fileName = match[1];
                    const cidName = path.parse(fileName).name;
                    const imgPath = path.join(tempDir, 'images', fileName);

                    if (fs.existsSync(imgPath)) {
                        attachments.push({
                            filename: fileName,
                            path: imgPath,
                            cid: cidName
                        });

                        html = html.replace(`src="images/${fileName}"`, `src="cid:${cidName}"`);
                    }
                }

                let new_payload = renderTemplate(html, msg.payload);

                // ggf. mit schalter
                new_payload = removeGoogleRedirects(new_payload);

                msg.payload = new_payload;

                node.send(msg);
            } catch (queryError) {
                node.error(`Generate the content: ${queryError.message}`, msg);
            }
        });
    }

    RED.nodes.registerType('processcube-google-docs-mail-template', ProcesssCubeGoogleDocsMailTemplate);
};
