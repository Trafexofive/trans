// user fields:
// id -> PRIMARY KEY
// name -> VARCHAR 100
// email -> VARCHAR 100
// password -> VARCHAR 100 (hashed)
// wins -> INTEGER
// loses -> INTEGER
// avatar -> varchar 300
// created_at -> TIMESTAMP

const bcrypt = require("bcrypt");

const UserModel = {
    users_init() {
        return `CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name VARCHAR(100) NOT NULL UNIQUE,
            email VARCHAR(100) NOT NULL UNIQUE,
            password VARCHAR(100) NOT NULL,
            wins INTEGER DEFAULT 0,
            loses INTEGER DEFAULT 0,
            avatar VARCHAR(300),
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );`;
    },

    users_index_email() {
        return `CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);`;
    },

    users_index_name() {
        return `CREATE INDEX IF NOT EXISTS idx_users_name ON users (name);`;
    },

    async user_fetch_by_email(db, email)
    {
        try {
            const stmt = db.prepare(`
                SELECT *
                FROM users
                WHERE email = ?
            `);
            const result = await stmt.get(email);
            if (result === undefined) {
                return {
                    success: false,
                    code: 404,
                    result: "user not found",
                };
            }

            return {
                success: true,
                code: 200,
                result: result,
            };
        } catch (err) {
            return {
                success: false,
                code: 500,
                result: err.message,
            };
        }
    },

    async user_fetch(db, userId) {
        try {
            const stmt = db.prepare(`
                SELECT *
                FROM users
                WHERE id = ?
            `);
            const result = await stmt.get(userId);
            if (result === undefined) {
                return {
                    success: false,
                    code: 404,
                    result: "user not found",
                };
            }

            const { password, ...user_no_password } = result;
            return {
                success: true,
                code: 200,
                result: user_no_password,
            };
        } catch (err) {
            return {
                success: false,
                code: 500,
                result: err.message,
            };
        }
    },

    async user_all(db) {
        try {
            const stmt = db.prepare(`
                SELECT id, name, email, wins, loses, avatar, created_at
                FROM users
            `);
            const result = await stmt.all();
            return {
                success: true,
                code: 200,
                result: result,
            };
        } catch (err) {
            return {
                success: false,
                code: 500,
                result: err.message,
            };
        }
    },

    async user_create(
        db,
        name,
        email,
        password,
        avatar = "/avatars/default.png",
    ) {
        try {
            const hashedPassword = await bcrypt.hash(password, 10);
            const stmt = db.prepare(`
                INSERT
                INTO users (name, email, password, avatar)
                VALUES (?, ?, ?, ?)
            `);
            const result = await stmt.run(name, email, hashedPassword, avatar);
            if (result.changes === 0) {
                return {
                    success: false,
                    code: 400,
                    result: "user creation failed",
                };
            }
            return {
                success: true,
                code: 200,
                result: result.changes,
            };
        } catch (err) {
            if (err.code === "SQLITE_CONSTRAINT_UNIQUE") {
                return {
                    success: false,
                    code: 409,
                    result: "A user with that name or email already exists.", // More descriptive error
                };
            }
            return {
                success: false,
                code: 500,
                result: err.message,
            };
        }
    },

    async user_update_profile(db, user_id, { name, avatar }) {
        try {
            // Build the query dynamically based on provided fields
            const fields = [];
            const values = [];
            if (name) {
                fields.push("name = ?");
                values.push(name);
            }
            if (avatar) {
                fields.push("avatar = ?");
                values.push(avatar);
            }

            if (fields.length === 0) {
                return { success: false, code: 400, result: "No fields to update." };
            }

            const stmt = db.prepare(`
                UPDATE users
                SET ${fields.join(", ")}
                WHERE id = ?
            `);
            const result = await stmt.run(...values, user_id);

            if (result.changes === 0) {
                return { success: false, code: 404, result: "User not found or no changes made." };
            }

            return { success: true, code: 200, result: "Profile updated successfully." };

        }
        catch (err)
        {
            if (err.code === "SQLITE_CONSTRAINT_UNIQUE")
            {
                return { success: false, code: 409, result: "That name is already taken." };
            }
            return { success: false, code: 500, result: err.message };
        }
    },


    async user_add_win(db, user_id) {
        try {
            const stmt = db.prepare(
                `UPDATE users SET wins = wins + 1 WHERE id = ?`,
            );
            await stmt.run(user_id);
            return { success: true, code: 200, result: "win added" };
        } catch (err) {
            return { success: false, code: 500, result: err.message };
        }
    },

    async user_add_loss(db, user_id) {
        try {
            const stmt = db.prepare(
                `UPDATE users SET loses = loses + 1 WHERE id = ?`,
            );
            await stmt.run(user_id);
            return { success: true, code: 200, result: "lose added" };
        } catch (err) {
            return { success: false, code: 500, result: err.message };
        }
    },

    async get_user_match_history(db, user_id) {
        try {
            const stmt = db.prepare(`
                SELECT
                    m.id,
                    p1.name as player1_name,
                    p2.name as player2_name,
                    m.winner_id,
                    m.created_at
                FROM matches m
                JOIN users p1 ON m.player1_id = p1.id
                LEFT JOIN users p2 ON m.player2_id = p2.id
                WHERE (m.player1_id = ? OR m.player2_id = ?) AND m.status = 'completed'
                ORDER BY m.created_at DESC
                LIMIT 20
            `);
            const res = await stmt.all(user_id, user_id);
            return { success: true, code: 200, result: res };
        } catch (err) {
            return { success: false, code: 500, result: err.message };
        }
    },

};

module.exports = UserModel;
