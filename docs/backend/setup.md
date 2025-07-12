# Backend Setup & Installation

This document outlines the steps required to set up and run the backend service for the Transcendence project.

## I. Prerequisites

-   **Docker & Docker Compose:** The entire application stack is containerized. Ensure you have the latest stable versions installed.
-   **`.env` File:** The backend relies on environment variables for configuration.

## II. Local Development Setup

The local development environment is designed for hot-reloading and ease of use.

1.  **Create the Environment File:**
    In the project's root directory, copy the `example-backend.env` file to a new file named `backend.env`.

    ```bash
    cp example-backend.env backend.env
    ```

2.  **Review Configuration:**
    Open `backend.env` and review the variables. For local development, the defaults are generally sufficient. Key variables include:
    -   `PORT`: The port the Fastify server will listen on inside the container.
    -   `JWT_KEY`: A secret key for signing JWT tokens.
    -   `DB_PATH`: The path to the SQLite database file.

3.  **Run the Service:**
    From the project root, use the master `Makefile` to bring up the development stack. This command uses `docker-compose.dev.yml` which mounts the local source code into the container.

    ```bash
    make up
    ```
    or
    ```bash
    make app
    ```
    
    Any changes made to the source code in `/app/backend/src` will trigger an automatic restart of the Node.js server within the container.

## III. Production Environment

The production environment uses a multi-stage `Dockerfile` to create a lean, optimized, and secure image. It does not use bind-mounts.

1.  **Build the Production Image:**
    From the project root, use the `Makefile` target designed for production builds.

    ```bash
    make build-prod
    ```

2.  **Run Production Stack:**
    The production stack is defined in the base `docker-compose.yml`. It can be launched using a similar make command (to be defined) or directly with Docker Compose.

    ```bash
    docker-compose up -d --build
    ```

This setup ensures a clean separation between development and production environments, adhering to best practices for containerized applications.
