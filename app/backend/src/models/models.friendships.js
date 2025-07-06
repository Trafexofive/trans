
const FriendshipModel = {
    friendships_init: () =>
        `CREATE TABLE IF NOT EXISTS friendships (user_id INTEGER NOT NULL, friend_id INTEGER NOT NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY (user_id, friend_id), FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE, FOREIGN KEY (friend_id) REFERENCES users(id) ON DELETE CASCADE);`,
    friend_requests_init: () =>
        `CREATE TABLE IF NOT EXISTS friend_requests (id INTEGER PRIMARY KEY AUTOINCREMENT, sender_id INTEGER NOT NULL, receiver_id INTEGER NOT NULL, status TEXT NOT NULL DEFAULT 'pending', created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE, FOREIGN KEY (receiver_id) REFERENCES users(id) ON DELETE CASCADE, UNIQUE (sender_id, receiver_id));`,
    blocked_users_init: () =>
        `CREATE TABLE IF NOT EXISTS blocked_users (blocker_id INTEGER NOT NULL, blocked_id INTEGER NOT NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY (blocker_id, blocked_id), FOREIGN KEY (blocker_id) REFERENCES users(id) ON DELETE CASCADE, FOREIGN KEY (blocked_id) REFERENCES users(id) ON DELETE CASCADE);`,

    async create_friend_request(db, sender_id, receiver_id) {
        try {
            const stmt = db.prepare(
                `INSERT INTO friend_requests (sender_id, receiver_id) VALUES (?, ?)`,
            );
            await stmt.run(sender_id, receiver_id);
            return { success: true, code: 201, result: "Friend request sent." };
        } catch (err) {
            return {
                success: false,
                code: err.code === "SQLITE_CONSTRAINT_UNIQUE" ? 409 : 500,
                result: err.code === "SQLITE_CONSTRAINT_UNIQUE"
                    ? "A request already exists."
                    : err.message,
            };
        }
    },

    async get_pending_requests(db, user_id) {
        try {
            const stmt = db.prepare(
                `SELECT fr.id, u.id as sender_id, u.name as sender_name, u.avatar as sender_avatar FROM friend_requests fr JOIN users u ON fr.sender_id = u.id WHERE fr.receiver_id = ? AND fr.status = 'pending'`,
            );
            const res = await stmt.all(user_id);
            return { success: true, code: 200, result: res };
        } catch (err) {
            return { success: false, code: 500, result: err.message };
        }
    },

    async accept_friend_request(db, request_id, receiver_id) {
        const tx = db.transaction(() => {
            const request = db.prepare(
                `SELECT * FROM friend_requests WHERE id = ? AND receiver_id = ? AND status = 'pending'`,
            ).get(request_id, receiver_id);
            if (!request) {
                throw new Error("Request not found or permission denied.");
            }

            db.prepare(
                `INSERT OR IGNORE INTO friendships (user_id, friend_id) VALUES (?, ?)`,
            ).run(request.sender_id, request.receiver_id);
            db.prepare(
                `INSERT OR IGNORE INTO friendships (user_id, friend_id) VALUES (?, ?)`,
            ).run(request.receiver_id, request.sender_id);
            db.prepare(`DELETE FROM friend_requests WHERE id = ?`).run(
                request_id,
            );
            return {
                success: true,
                code: 200,
                result: "Friend request accepted.",
            };
        });
        try {
            return tx();
        } catch (err) {
            return { success: false, code: 404, result: err.message };
        }
    },

    async decline_friend_request(db, request_id, user_id) {
        try {
            const info = db.prepare(
                `DELETE FROM friend_requests WHERE id = ? AND receiver_id = ?`,
            ).run(request_id, user_id);
            if (info.changes === 0) {
                return {
                    success: false,
                    code: 404,
                    result: "Request not found.",
                };
            }
            return {
                success: true,
                code: 200,
                result: "Friend request declined.",
            };
        } catch (err) {
            return { success: false, code: 500, result: err.message };
        }
    },

    async cancel_friend_request(db, request_id, user_id) {
        try {
            const info = db.prepare(
                `DELETE FROM friend_requests WHERE id = ? AND sender_id = ?`,
            ).run(request_id, user_id);
            if (info.changes === 0) {
                return {
                    success: false,
                    code: 404,
                    result: "Request not found.",
                };
            }
            return {
                success: true,
                code: 200,
                result: "Friend request cancelled.",
            };
        } catch (err) {
            return { success: false, code: 500, result: err.message };
        }
    },

    async remove_friend(db, user_id, friend_id) {
        try {
            db.prepare(
                `DELETE FROM friendships WHERE (user_id = ? AND friend_id = ?) OR (user_id = ? AND friend_id = ?)`,
            ).run(user_id, friend_id, friend_id, user_id);
            return { success: true, code: 200, result: "Friend removed." };
        } catch (err) {
            return { success: false, code: 500, result: err.message };
        }
    },

    async get_friends(db, user_id) {
        try {
            const stmt = db.prepare(
                `SELECT u.id, u.name, u.email, u.avatar FROM users u JOIN friendships f ON u.id = f.friend_id WHERE f.user_id = ? UNION SELECT u.id, u.name, u.email, u.avatar FROM users u JOIN friendships f ON u.id = f.user_id WHERE f.friend_id = ?`,
            );
            return {
                success: true,
                code: 200,
                result: await stmt.all(user_id, user_id),
            };
        } catch (err) {
            return { success: false, code: 500, result: err.message };
        }
    },

    async get_friend_ids(db, user_id) {
        try {
            const stmt = db.prepare(
                `SELECT friend_id as id FROM friendships WHERE user_id = ? UNION SELECT user_id as id FROM friendships WHERE friend_id = ?`,
            );
            return {
                success: true,
                code: 200,
                result: (await stmt.all(user_id, user_id)).map((item) =>
                    item.id
                ),
            };
        } catch (err) {
            return { success: false, code: 500, result: err.message };
        }
    },

    async get_all_request_statuses(db, user_id) {
        try {
            const sent_stmt = db.prepare(
                `SELECT receiver_id, id FROM friend_requests WHERE sender_id = ? AND status = 'pending'`,
            );
            const received_stmt = db.prepare(
                `SELECT sender_id, id FROM friend_requests WHERE receiver_id = ? AND status = 'pending'`,
            );
            const sent = await sent_stmt.all(user_id);
            const received = await received_stmt.all(user_id);
            return { success: true, code: 200, result: { sent, received } };
        } catch (err) {
            return { success: false, code: 500, result: err.message };
        }
    },

    async block_user(db, blocker_id, blocked_id) {
        try {
            const stmt = db.prepare(
                `INSERT OR IGNORE INTO blocked_users (blocker_id, blocked_id) VALUES (?, ?)`,
            );
            await stmt.run(blocker_id, blocked_id);
            return { success: true, code: 201, result: "User blocked." };
        } catch (err) {
            return { success: false, code: 500, result: err.message };
        }
    },

    async unblock_user(db, blocker_id, blocked_id) {
        try {
            const stmt = db.prepare(
                `DELETE FROM blocked_users WHERE blocker_id = ? AND blocked_id = ?`,
            );
            const info = await stmt.run(blocker_id, blocked_id);
            if (info.changes === 0) {
                return {
                    success: false,
                    code: 404,
                    result: "Block relationship not found.",
                };
            }
            return { success: true, code: 200, result: "User unblocked." };
        } catch (err) {
            return { success: false, code: 500, result: err.message };
        }
    },

    async check_block(db, user1_id, user2_id) {
        try {
            const stmt = db.prepare(
                `SELECT 1 FROM blocked_users WHERE (blocker_id = ? AND blocked_id = ?) OR (blocker_id = ? AND blocked_id = ?) LIMIT 1`,
            );
            const res = await stmt.get(user1_id, user2_id, user2_id, user1_id);
            return { success: true, result: !!res };
        } catch (err) {
            return { success: false, result: false };
        }
    },
};

module.exports = FriendshipModel;
