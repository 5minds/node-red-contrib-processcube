const Mustache = require('mustache');
const fs = require('fs');

const swaggerFilename = '../../ProcessCube.Engine/docs/swagger/swagger.json';  // Dateiname der Swagger-Datei

const swaggerJson = JSON.parse(fs.readFileSync(swaggerFilename, 'utf-8'));

//console.log(Object.keys(swaggerJson.paths));
//return

const apiPath = '/process_instances/query';  // Die API-Route, die du dokumentieren möchtest
const routeData = swaggerJson.paths[apiPath];

if (routeData) {
    console.log(`Details for ${apiPath}:`, routeData);
} else {
    console.error(`Route ${apiPath} not found in Swagger documentation.`);
}

// API-Route-Information vorbereiten
const apiRouteData = {
    path: apiPath,
    method: Object.keys(routeData)[0],  // z.B. GET, POST, etc.
    summary: routeData[Object.keys(routeData)[0]].summary,
    description: routeData[Object.keys(routeData)[0]].description,
    parameters: routeData[Object.keys(routeData)[0]].parameters || [],
    responses: Object.entries(routeData[Object.keys(routeData)[0]].responses).map(([status, response]) => ({
        status,
        description: response.description
    }))
};

// Mustache-Template einlesen
const template = fs.readFileSync('query_template.mustache', 'utf-8');

// Mustache-Rendering
const output = Mustache.render(template, apiRouteData);

// Ausgabe in eine Datei schreiben oder anzeigen
console.log(output);
fs.writeFileSync('output.md', output);
