# HowTo develop this package

## What you need?

- docker
- node
- npm

## Get Started?

1. Clone this repository
2. Run `npm install`
3. docker compose build
4. docker compose up
5. Connect to app via vscode launch.json (Attach to Node-RED)

    5.1 If you do not have a .vscode/launch.json please create one and add the following code:

    ```yaml
    {
        "version": "0.2.0",
        "configurations": [
            {
            "type": "node",
            "request": "attach",
            "name": "Attach to Node-RED",
            "port": 9229,
            "address": "localhost",
            "localRoot": "${workspaceFolder}",
            "remoteRoot": "/package_src"
            }
        ]
    }
    ```

    5.2 Go to run and Debug view, select Attach to Node-RED and press the "Start debuggin" or press F5.
    You need to open localhost:1880 to run Node-RED and use your node.

6. Happy coding
