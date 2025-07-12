# Authentication & Authorization

The application employs a robust, token-based authentication system using JSON Web Tokens (JWT) and supports OAuth2 for third-party logins.

## I. Standard JWT Flow (Email/Password)

1.  **Login:** The client sends a `POST` request to `/api/auth/login` with the user's `email` and `password`.
2.  **Token Issuance:** If the credentials are valid, the server generates two JWTs:
    -   **Access Token:** A short-lived token (e.g., 15 minutes) containing user payload. This token is sent in the `Authorization: Bearer <token>` header for all subsequent authenticated API requests.
    -   **Refresh Token:** A long-lived token (e.g., 7-15 days) stored securely by the client (e.g., `localStorage`). Its sole purpose is to get a new access token.
3.  **Authenticated Requests:** The client attaches the **Access Token** to the `Authorization` header for all protected routes. The `fastify.auth` hook on the backend verifies this token on every request.
4.  **Token Expiration & Refresh:**
    -   If an API request returns a `401 Unauthorized` error, the client assumes the access token has expired.
    -   The client then sends its stored **Refresh Token** to the `POST /api/auth/refresh` endpoint.
    -   The server validates the refresh token and, if valid, issues a new access token.
    -   The client replaces its expired access token with the new one and retries the original failed API request.
    -   If the refresh token is also expired or invalid, the user is logged out and redirected to the login page.

## II. OAuth2 Flow (Google)

1.  **Initiation:** The client navigates the user to the backend endpoint `GET /login/google`.
2.  **Redirect to Provider:** The backend redirects the user to Google's authentication screen.
3.  **User Consent:** The user logs in and grants permission to the application.
4.  **Callback to Backend:** Google redirects the user back to the `callbackUri` specified in the backend configuration (`/login/google/callback`), including an authorization `code`.
5.  **Token Exchange & User Provisioning:**
    -   The backend exchanges the `code` with Google for an access token.
    -   It uses this token to fetch the user's profile information (email, name, avatar) from Google's API.
    -   It checks if a user with that email exists in the local database.
        -   If **yes**, it proceeds to the next step.
        -   If **no**, it creates a new user in the local database with the information from Google and a secure, random password.
6.  **JWT Issuance:** The backend generates its own application-specific access and refresh tokens for the user, exactly as in the standard flow.
7.  **Redirect to Frontend:** The backend redirects the user to a dedicated frontend callback page (e.g., `/google-callback`), passing the newly generated access and refresh tokens as URL query parameters.
8.  **Session Storage:** The frontend callback page extracts the tokens from the URL, stores them in `localStorage`, and redirects the user to the main dashboard, completing the login process.
