## Backend Data Model Reference

---

### 1. `users` Model
**File:** `models.users.js`
**Purpose:** Manages all user-related data, including authentication details, profile information, and game statistics.

| Field Name | Data Type | Description |
| :--- | :--- | :--- |
| `id` | INTEGER | Unique identifier for the user. Primary Key. |
| `name` | VARCHAR(100) | The user's unique display name. |
| `email` | VARCHAR(100) | The user's unique email address. |
| `password` | VARCHAR(100) | The user's hashed password. **Never sent to the frontend.** |
| `wins` | INTEGER | Total number of games won. Defaults to 0. |
| `loses` | INTEGER | Total number of games lost. Defaults to 0. |
| `avatar` | VARCHAR(300) | URL path to the user's avatar image. Defaults to `/avatars/default.png`. |
| `created_at` | DATETIME | Timestamp of when the user account was created. |

---

### 2. `chat` Model
**File:** `models.chat.js`
**Purpose:** Stores all direct message history between users.

| Field Name | Data Type | Description |
| :--- | :--- | :--- |
| `id` | INTEGER | Unique identifier for the chat message. Primary Key. |
| `sender_id` | INTEGER | The `id` of the user who sent the message. Foreign Key to `users(id)`. |
| `recipient_id` | INTEGER | The `id` of the user who received the message. Foreign Key to `users(id)`. |
| `message` | TEXT | The content of the chat message. |
| `is_delivered`| BOOLEAN | Flag indicating if the message was delivered. Defaults to `0` (false). |
| `created_at` | TIMESTAMP | Timestamp of when the message was sent. |
| `delivered_at`| TIMESTAMP | Timestamp of when the message was marked as delivered. |

---

### 3. `friendships` Models
**File:** `models.friendships.js`
**Purpose:** Manages all social relationships between users, including friendships, pending requests, and blocks.

#### `friendships` Table
Stores the established friendship links.

| Field Name | Data Type | Description |
| :--- | :--- | :--- |
| `user_id` | INTEGER | The `id` of one user in the friendship. Part of a composite Primary Key. |
| `friend_id` | INTEGER | The `id` of the other user in the friendship. Part of a composite Primary Key. |
| `created_at` | TIMESTAMP | Timestamp of when the friendship was established. |

#### `friend_requests` Table
Tracks pending friend requests between users.

| Field Name | Data Type | Description |
| :--- | :--- | :--- |
| `id` | INTEGER | Unique identifier for the friend request. Primary Key. |
| `sender_id` | INTEGER | The `id` of the user who sent the request. Foreign Key to `users(id)`. |
| `receiver_id` | INTEGER | The `id` of the user who received the request. Foreign Key to `users(id)`. |
| `status` | TEXT | The current status of the request (e.g., 'pending'). Defaults to 'pending'. |
| `created_at` | TIMESTAMP | Timestamp of when the request was sent. |

#### `blocked_users` Table
Stores information about which users have blocked others.

| Field Name | Data Type | Description |
| :--- | :--- | :--- |
| `blocker_id`| INTEGER | The `id` of the user initiating the block. Part of a composite Primary Key. |
| `blocked_id`| INTEGER | The `id` of the user being blocked. Part of a composite Primary Key. |
| `created_at`| TIMESTAMP | Timestamp of when the block was initiated. |

---

### 4. `tournament` Models
**File:** `models.tournament.js`
**Purpose:** Manages all data related to tournaments, participants, and individual matches.

#### `tournaments` Table
The main table for tournament details.

| Field Name | Data Type | Description |
| :--- | :--- | :--- |
| `id` | INTEGER | Unique identifier for the tournament. Primary Key. |
| `name` | VARCHAR(100)| The name of the tournament. |
| `creator_id`| INTEGER | The `id` of the user who created the tournament. Foreign Key to `users(id)`. |
| `status` | TEXT | The current status of the tournament ('pending', 'in_progress', 'completed'). |
| `created_at`| TIMESTAMP | Timestamp of when the tournament was created. |

#### `tournament_participants` Table
Links users to the tournaments they have joined.

| Field Name | Data Type | Description |
| :--- | :--- | :--- |
| `tournament_id`| INTEGER | The `id` of the tournament. Part of a composite Primary Key. |
| `user_id` | INTEGER | The `id` of the user who joined. Part of a composite Primary Key. |
| `joined_at` | TIMESTAMP | Timestamp of when the user joined the tournament. |

#### `matches` Table
Stores every match played within a tournament.

| Field Name | Data Type | Description |
| :--- | :--- | :--- |
| `id` | INTEGER | Unique identifier for the match. Primary Key. |
| `tournament_id`| INTEGER | The `id` of the tournament this match belongs to. Foreign Key to `tournaments(id)`. |
| `round_number`| INTEGER | The round number within the tournament. |
| `player1_id` | INTEGER | The `id` of the first player. Foreign Key to `users(id)`. |
| `player2_id` | INTEGER | The `id` of the second player (can be null for a bye). Foreign Key to `users(id)`. |
| `winner_id` | INTEGER | The `id` of the winning user (null until the match is completed). Foreign Key to `users(id)`. |
| `status` | TEXT | The status of the match ('pending', 'in_progress', 'completed'). |
| `created_at`| TIMESTAMP | Timestamp of when the match was created. |

---

### 5. `two_fa` Model
**File:** `models.two_fa.js`
**Purpose:** Stores the Two-Factor Authentication secrets for users.

| Field Name | Data Type | Description |
| :--- | :--- | :--- |
| `id` | INTEGER | Unique identifier for the 2FA record. Primary Key. |
| `user_id` | INTEGER | The `id` of the user this 2FA secret belongs to. Foreign Key to `users(id)`. |
| `ascii`, `hex`, `base32` | VARCHAR | Different encodings of the 2FA secret. |
| `otpauth_url` | VARCHAR | The full URL used to generate the QR code for authenticator apps. |
| `verified` | INTEGER | A flag (`0` or `1`) to indicate if the user has successfully verified the 2FA setup. |
| `created_at` | TIMESTAMP | Timestamp of when the 2FA secret was generated. |

---

### 6. `refresh_tokens` Model
**File:** `models.refresh_tokens.js`
**Purpose:** Stores the refresh tokens used to issue new access tokens without requiring the user to log in again. This is a backend-internal model.

| Field Name | Data Type | Description |
| :--- | :--- | :--- |
| `id` | INTEGER | Unique identifier for the token record. |
| `user_id` | INTEGER | The `id` of the user this token belongs to. |
| `token` | VARCHAR | The refresh token string itself. |
| `expires_at`| TIMESTAMP | The expiration date of the refresh token. |
| `created_at`| TIMESTAMP | Timestamp of when the token was created. |
