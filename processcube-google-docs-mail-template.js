module.exports = function (RED) {

    const fs = require('fs');
    const path = require('path');
    const { pipeline } = require('stream');
    const { promisify } = require('util');
    const AdmZip = require('adm-zip');
    const fetch = require('node-fetch');

    const streamPipeline = promisify(pipeline);

    function ProcesssCubeGoogleDocsMailTemplate(config) {
        RED.nodes.createNode(this, config);
        const node = this;

        const template_link = config.template_link;

        node.on('input', async function (msg) {

            try {

                async function inlineCssImport(html) {
                    // 1. Finde @import-Zeile
                    const importRegex = /@import\s+url\(([^)]+)\);?/;
                    const match = html.match(importRegex);
                    if (!match) return html; // keine @import-Zeile gefunden

                    const url = match[1].replace(/['"]/g, ''); // evtl. Anführungszeichen entfernen

                    try {
                        const response = await fetch(url);
                        if (!response.ok) throw new Error(`Fehler beim Laden von ${url}`);

                        const cssContent = await response.text();

                        // 2. Ersetze @import-Zeile durch eingebettetes CSS
                        const embeddedStyle = `\n/* inlined from ${url} */\n${cssContent}`;
                        return html.replace(importRegex, embeddedStyle);
                    } catch (error) {
                        console.error('Fehler beim Inlining der CSS-Datei:', error);
                        return html; // Fallback: Original belassen
                    }
                }


                function convertGoogleDriveLink(link) {
                    // Format 0: https://docs.google.com/document/d/FILE_ID/edit
                    const editMatch = link.match(/https:\/\/docs\.google\.com\/document\/d\/([^/]+)/);
                    if (editMatch) {
                        const fileId = editMatch[1];
                        return `https://docs.google.com/document/d/${fileId}/export?format=zip`;
                    }

                    // Format 1: https://drive.google.com/file/d/FILE_ID/view?usp=sharing
                    const fileMatch = link.match(/https:\/\/drive\.google\.com\/file\/d\/([^/]+)\/view/);
                    if (fileMatch) {
                        return `https://drive.google.com/uc?export=download&id=${fileMatch[1]}`;
                    }

                    // Format 2: https://drive.google.com/open?id=FILE_ID
                    const openMatch = link.match(/https:\/\/drive\.google\.com\/open\?id=([^&]+)/);
                    if (openMatch) {
                        return `https://drive.google.com/uc?export=download&id=${openMatch[1]}`;
                    }

                    // Anderenfalls unverändert zurückgeben
                    return link;
                }

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

                const url = convertGoogleDriveLink(template_link);

                const response = await fetch(url);
                if (!response.ok) {
                    throw new Error(`Fehler beim Herunterladen: ${response.status} ${response.statusText}`);
                }
                await streamPipeline(response.body, fs.createWriteStream(zipPath));

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

                html = await inlineCssImport(html);

                let new_payload = renderTemplate(html, msg.payload);

                // ggf. mit schalter
                new_payload = removeGoogleRedirects(new_payload);

                msg.payload = new_payload;
                msg.attachments = attachments;


                node.send(msg);
            } catch (queryError) {
                node.error(`Generate the content: ${queryError.message}`, msg);
            }
        });
    }

    RED.nodes.registerType('processcube-google-docs-mail-template', ProcesssCubeGoogleDocsMailTemplate);
};
