const Mustache = require('mustache');
const fs = require('fs');

const SwaggerParser = require('swagger-parser');

//const swaggerFilename = '../../ProcessCube.Engine/docs/swagger/swagger.json';  // Dateiname der Swagger-Datei
const swaggerFilename = 'swagger.json';  // Dateiname der Swagger-Datei


//SwaggerParser.dereference("http://localhost:8000/atlas_engine/api/v1/swagger")
SwaggerParser.dereference(swaggerFilename)
.then(swaggerJson => {
    console.log('Dereferenced API:', swaggerJson);

    const apiPaths = [{
        "ProcessInstance Query": {
            "path": "/process_instances/query",
            "method": "get"
        },
        "UserTasks Query": {
            "path": "/process_instances/query",
            "method": "get"
        },
        "Wait for UserTask": {
            "path": "/process_instances/query",
            "method": "get"
        },
        "UserTask Event Listener": {
            "path": "/process_instances/query",
            "method": "get"
        }
    }];

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

    const outputFilename = apiPath.replace(/\//g, '_') + '.md';

    fs.writeFileSync(outputFilename, output);
    
  })
  .catch(err => {
    console.error('Dereferencing failed:', err);
  });