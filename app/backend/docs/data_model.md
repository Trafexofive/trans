
## Backend Data Model Reference

Here is a comprehensive breakdown of the data structures and functions available from your backend.

### 1. `users` Model
**File:** `models.users.js`
**Purpose:** Manages all user-related data, including authentication details, profile information, and game statistics.

#### Fields
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

#### Provided Functions
- `user_fetch(db, userId)`: Fetches a single user by their `id`. Crucially, it **removes the password** before returning, making it safe for frontend display.
- `user_all(db)`: Fetches all users. Also removes passwords.
- `user_create(db, name, email, password, avatar?)`: Creates a new user. The `avatar` is optional and has a default value.
- `user_update(...)`: Updates a user's details.
- `user_add_win(db, userId)`: Increments the `wins` count for a user by 1.
- `user_add_loss(db, userId)`: Increments the `loses` count for a user by 1.
- `user_fetch_by_email(db, email)`: Fetches a user by email. **Includes the password** and is only intended for internal backend use during login.

---

### 2. `chat` Model
**File:** `models.chat.js`
**Purpose:** Stores all direct message history between users.

#### Fields
| Field Name | Data Type | Description |
| :--- | :--- | :--- |
| `id` | INTEGER | Unique identifier for the chat message. Primary Key. |
| `sender_id` | INTEGER | The `id` of the user who sent the message. Foreign Key to `users(id)`. |
| `recipient_id` | INTEGER | The `id` of the user who received the message. Foreign Key to `users(id)`. |
| `message` | TEXT | The content of the chat message. |
| `is_delivered` | BOOLEAN | Flag indicating if the message was delivered. Defaults to `0` (false). |
| `created_at` | TIMESTAMP | Timestamp of when the message was sent. |
| `delivered_at` | TIMESTAMP | Timestamp of when the message was marked as delivered. |

#### Provided Functions
- `chat_get_by_id(db, sender_id, recipient_id)`: Retrieves the message history **between two specific users**.
- `chat_get_unread(db, recipient_id)`: Gets all messages for a user that have `is_delivered = 0`.
- `chat_mark_delivered_bulk(db, recipient_id)`: Marks all unread messages for a user as delivered.
- `chat_create(db, msg_data)`: Creates and stores a new chat message.
- `chat_get_profiles(db, user_id)`: A very useful function that returns a list of user profiles with whom the given user has a chat history or is friends with. Ideal for building the conversation list on the frontend.

---

### 3. `friendships` Model
**File:** `models.friendships.js`
**Purpose:** Manages the relationships between users who are friends.

#### Fields
| Field Name | Data Type | Description |
| :--- | :--- | :--- |
| `user_id` | INTEGER | The `id` of the user who initiated the friendship. Part of a composite Primary Key. |
| `friend_id` | INTEGER | The `id` of the user who was added as a friend. Part of a composite Primary Key. |
| `created_at` | TIMESTAMP | Timestamp of when the friendship was established. |

#### Provided Functions
- `add_friend(db, user_id, friend_id)`: Creates a new friendship record.
- `remove_friend(db, user_id, friend_id)`: Removes a friendship record.
- `check_friendship(db, user_id, friend_id)`: Checks if a friendship exists between two users.
- `get_friends(db, user_id)`: Returns a list of full user profiles who are friends with the given user.

---

### 4. `two_fa` Model
**File:** `models.two_fa.js`
**Purpose:** Stores the Two-Factor Authentication secrets for users.

#### Fields
| Field Name | Data Type | Description |
| :--- | :--- | :--- |
| `id` | INTEGER | Unique identifier for the 2FA record. Primary Key. |
| `user_id` | INTEGER | The `id` of the user this 2FA secret belongs to. Foreign Key to `users(id)`. |
| `ascii`, `hex`, `base32` | VARCHAR | Different encodings of the 2FA secret. |
| `otpauth_url` | VARCHAR | The full URL used to generate the QR code for authenticator apps. |
| `verified` | INTEGER | A flag (`0` or `1`) to indicate if the user has successfully verified the 2FA setup. |
| `created_at` | TIMESTAMP | Timestamp of when the 2FA secret was generated. |

#### Provided Functions
- `two_fa_get_by_id(db, user_id)`: Retrieves the 2FA secret for a user.
- `two_fa_create(db, user_id, secret)`: Creates and stores a new 2FA secret.
- `two_fa_delete_by_id(db, user_id)`: Deletes a user's 2FA secret.
- `two_fa_verify_by_id(db, user_id)`: Sets the `verified` flag to `1`.

---

### 5. `refresh_tokens` Model
**File:** `models.refresh_tokens.js`
**Purpose:** Stores the refresh tokens used to issue new access tokens without requiring the user to log in again. This is a backend-internal model and is not directly exposed to the frontend.

#### Fields
| Field Name | Data Type | Description |
| :--- | :--- | :--- |
| `id` | INTEGER | Unique identifier for the token record. |
| `user_id` | INTEGER | The `id` of the user this token belongs to. |
| `token` | VARCHAR | The refresh token string itself. |
| `expires_at`| TIMESTAMP | The expiration date of the refresh token. |
| `created_at`| TIMESTAMP | Timestamp of when the token was created. |
