# ProcessCube Node-RED Integration

This repository contains Node-RED flows for integrating the ProcessCube system. The flows include nodes for starting processes and handling external tasks.

## Prerequisites

Before running the Node-RED flows, make sure you have the following prerequisites installed:

- Docker
- Docker Compose

## Installation

To install and run the Node-RED flows, follow these steps:

1. Clone this repository to your local machine:

    ```bash
    git clone https://github.com/5minds/processcube_nodered.git
    ```

2. Change to the project directory:

    ```bash
    cd processcube_nodered
    ```

3. Build the Docker containers:

    ```bash
    docker-compose build
    ```

4. Start the Docker containers:

    ```bash
    docker-compose up -d
    ```

## Usage

Once the Docker containers are running, you can access the ProcessCube Node-RED interface using the following URLs:

- Engine: [http://localhost:8000](http://localhost:8000)
- Node-RED: [http://localhost:1880](http://localhost:1880)

In the Node-RED interface, you will find pre-configured flows for starting processes and handling external tasks. You can customize these flows to fit your specific requirements.

## Contributing

If you would like to contribute to this project, please follow these guidelines:

1. Fork the repository on GitHub.
2. Create a new branch for your feature or bug fix.
3. Commit your changes and push the branch to your fork.
4. Submit a pull request to the main repository.

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for more information.
