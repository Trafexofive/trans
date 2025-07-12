# WebSocket Event Architecture

The backend utilizes WebSockets for real-time communication for both the chat system and live gameplay. This document outlines the event structure.

All WebSocket connections require a valid JWT access token passed as a query parameter named `token`.
Example: `ws://localhost:3000/api/chat/socket?token=YOUR_JWT_TOKEN`

## I. Chat Socket (`/api/chat/socket`)

The chat socket is a persistent connection for real-time messaging and social updates.

### A. Server-to-Client Events

The server pushes events to the client. The client should have a single `onmessage` handler that parses the incoming JSON and routes based on the `type` property.

-   **Chat Message:**
    -   **Description:** A standard direct message from another user.
    -   **Payload (`event.data`):**
        ```json
        {
          "id": 101,
          "from": 2,
          "to": 1,
          "content": "Hello, world!",
          "timestamp": "2025-07-11T12:30:00.000Z"
        }
        ```

-   **Social Update Notification:**
    -   **Description:** A generic event indicating that the user's social graph has changed (e.g., a friend was added/removed, a request was received/accepted). This is a signal for the client to re-fetch all relevant social data (`/api/friendships`, `/api/friendships/requests`, etc.). It does not contain the specific data to avoid client-side state desynchronization.
    -   **Payload (`event.data`):**
        ```json
        {
          "type": "social_update"
        }
        ```

### B. Client-to-Server Events

The client sends JSON messages to the server.

-   **Send Direct Message:**
    -   **Description:** Sends a message to a specific user.
    -   **Payload:**
        ```json
        {
          "to": 2,
          "content": "This is my reply."
        }
        ```

## II. Game Socket (`/api/game/socket`)

The game socket handles matchmaking and live game state synchronization.

### A. Server-to-Client Events

-   **`gameStart`**: Sent to both players when a match is found.
-   **`gameState`**: Sent 60 times per second during a match, containing the positions of paddles and the ball.
-   **`gameOver`**: Sent when a player reaches the score limit, indicating the winner.
-   **`error`**: Sent if an issue occurs (e.g., trying to join a queue twice).

### B. Client-to-Server Events

-   **`paddleMove`**: Sent by the client whenever the mouse moves over the canvas, updating their paddle position.
    -   **Payload:**
        ```json
        {
          "type": "paddleMove",
          "payload": { "y": 250.5 }
        }
        ```
