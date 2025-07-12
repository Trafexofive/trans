# API Endpoint Overview

This document provides a high-level summary of the available API routes. For detailed request/response schemas, please refer to the OpenAPI (Swagger) documentation available at the `/documentation` endpoint when the server is running.

All API routes are prefixed with `/api`. Authentication is required for most endpoints and is handled via a JWT Bearer token in the `Authorization` header.

## 1. Authentication (`/api/auth`)

-   **`POST /login`**: Authenticates a user with email and password, returning JWT access and refresh tokens.
-   **`POST /refresh`**: Issues a new access token using a valid refresh token.
-   **`DELETE /logout`**: Invalidates the user's session (implementation-dependent, e.g., by blacklisting tokens).
-   **`GET /login/google`**: (OAuth) Initiates the Google OAuth2 authentication flow.
-   **`GET /login/google/callback`**: (OAuth) Callback URL for Google to complete the authentication process.
-   **2FA Routes**: Includes endpoints for creating, verifying, and deleting 2FA secrets.

## 2. Users (`/api/users`)

-   **`GET /`**: Retrieves a list of all users.
-   **`GET /me`**: Retrieves the profile of the currently authenticated user.
-   **`PUT /me`**: Updates the profile (name) of the authenticated user.
-   **`POST /me/avatar`**: Updates the avatar for the authenticated user (expects multipart/form-data).
-   **`DELETE /me`**: Deletes the account of the authenticated user (requires password confirmation).
-   **`GET /:id`**: Retrieves the public profile of a specific user by their ID.
-   **`GET /:id/matches`**: Retrieves the match history for a specific user.

## 3. Friendships (`/api/friendships`)

-   **`GET /`**: Retrieves the friends list for the authenticated user.
-   **`POST /requests`**: Sends a friend request to another user.
-   **`GET /requests`**: Retrieves pending incoming friend requests for the authenticated user.
-   **`POST /requests/:id/accept`**: Accepts a pending friend request.
-   **`DELETE /requests/:id/decline`**: Declines a pending friend request.
-   **`DELETE /:friend_id`**: Removes a friend.
-   **`POST /block`**: Blocks a user.
-   **`DELETE /block/:blocked_id`**: Unblocks a user.

## 4. Chat (`/api/chat`)

-   **`GET /socket`**: (WebSocket) The endpoint for establishing a real-time chat connection. Authentication is handled via a `token` query parameter.
-   **`GET /`**: Retrieves a list of all users the authenticated user has had conversations with or is friends with.
-   **`GET /:id`**: Retrieves the chat history between the authenticated user and another user by their ID.

## 5. Game (`/api/game`)

-   **`GET /socket`**: (WebSocket) The endpoint for establishing a real-time game connection for matchmaking and gameplay.

## 6. Tournaments (`/api/tournaments`)

-   **`GET /`**: Retrieves a list of all active tournaments.
-   **`POST /`**: Creates a new tournament.
-   **`GET /:id`**: Retrieves the full details, participant list, and match bracket for a specific tournament.
-   **`POST /:id/join`**: Allows the authenticated user to join a tournament.
-   **`POST /:id/start`**: Allows the tournament creator to start the tournament.
