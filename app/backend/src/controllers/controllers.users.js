const fs = require("fs");
const util = require("util");
const { pipeline } = require("stream");
const pump = util.promisify(pipeline);
const { check_and_sanitize } = require("../utils/utils.security");
const UserModel = require("../models/models.users");
const FriendshipModel = require("../models/models.friendships");
const ChatModel = require("../models/models.chat");
const bcrypt = require("bcrypt");

function notifyUsers(connectionMap, userIds) {
    if (!connectionMap || !Array.isArray(userIds) || userIds.length === 0) {
        return;
    }
    const notification = JSON.stringify({ type: "social_update" });
    const uniqueUserIds = [...new Set(userIds)];

    uniqueUserIds.forEach((id) => {
        const socket = connectionMap.get(id);
        if (socket && socket.readyState === 1) { // WebSocket.OPEN
            socket.send(notification);
        }
    });
}

const UserCtrl = {
    async GetMySocialData(request, reply) {
        const userId = request.user.payload.id;
        try {
            const [
                friendsRes,
                pendingRequestsRes,
                requestStatusesRes,
                chatPartnersRes,
                blockedIdsRes,
            ] = await Promise.all([
                FriendshipModel.get_friends(this.db, userId),
                FriendshipModel.get_pending_requests(this.db, userId),
                FriendshipModel.get_all_request_statuses(this.db, userId),
                ChatModel.chat_get_profiles(this.db, userId),
                FriendshipModel.get_blocked_ids(this.db, userId),
            ]);

            reply.send({
                success: true,
                result: {
                    friends: friendsRes.success ? friendsRes.result : [],
                    pendingRequests: pendingRequestsRes.success ? pendingRequestsRes.result : [],
                    requestStatuses: requestStatusesRes.success ? requestStatusesRes.result : { sent: [], received: [] },
                    chatPartners: chatPartnersRes.success ? chatPartnersRes.result : [],
                    blockedUserIds: blockedIdsRes.success ? blockedIdsRes.result : [],
                },
            });
        } catch (error) {
            console.error("Error fetching social data:", error);
            reply.code(500).send({ success: false, result: "Failed to fetch social data." });
        }
    },

    async GetAllUsers(request, reply) {
        const res = await UserModel.user_all(this.db);
        reply.status(res.code).send(res);
    },

    async GetUserById(request, reply) {
        const id = request.params.id;
        const res = await UserModel.user_fetch(this.db, id);
        reply.status(res.code).send(res);
    },

    async GetMyProfile(request, reply) {
        const userId = request.user.payload.id;
        const res = await UserModel.user_fetch(this.db, userId);
        reply.status(res.code).send(res);
    },

    async CreateUser(request, reply) {
        const rawUserData = request.body;
        const { errors, sanitized, isValid } = check_and_sanitize(rawUserData);
        
        if (!isValid)
        {
            return reply.status(400).send({
                success: false,
                code: 400,
                result: errors.join(", ")
            })
        }
        
        const res = await UserModel.user_create(
            this.db,
            sanitized.name,
            sanitized.email,
            sanitized.password
        )

        reply.status(res.code).send(res);
    },

    async UpdateMyProfile(request, reply) {
        const userId = request.user.payload.id;
        const rawUserData = request.body;
        const { errors, sanitized, isValid } = check_and_sanitize(rawUserData);
        
        if (!isValid)
        {
            return reply.status(400).send({
                success: false,
                code: 400,
                result: errors.join(", ")
            })
        }

        const res = await UserModel.user_update_profile(this.db, userId, sanitized);
        reply.status(res.code).send(res);
    },

    async UpdateMyAvatar(request, reply) {
        const userId = request.user.payload.id;
        const data = await request.file();
        if (!data) {
            return reply.code(400).send({ success: false, result: "No file uploaded." });
        }

        const uploadDir = "./public/avatars";
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }

        const uniqueFilename = `${userId}-${Date.now()}-${data.filename.replace(/[^a-zA-Z0-9.]/g, "_")}`;
        const path = `${uploadDir}/${uniqueFilename}`;

        try {
            await pump(data.file, fs.createWriteStream(path));
        } catch (err) {
            console.error("File upload failed:", err);
            return reply.code(500).send({ success: false, result: "File upload failed." });
        }

        const avatarUrl = `/avatars/${uniqueFilename}`;
        const res = await UserModel.user_update_profile(this.db, userId, { avatar: avatarUrl });

        if (res.success) {
            notifyUsers(this.activeConnections, [userId]);
        }
        reply.status(res.code).send({ success: true, result: { avatarUrl } });
    },

    async DeleteUser(request, reply) {
        const userId = request.user.payload.id;
        const { password } = request.body;

        if (!password) {
            return reply.code(400).send({ success: false, result: "Password confirmation is required." });
        }

        const userResult = await UserModel.user_fetch_by_id_for_auth(this.db, userId);
        if (!userResult.success) {
            return reply.code(404).send({ success: false, result: "User not found." });
        }

        const is_valid = await bcrypt.compare(password, userResult.result.password);
        if (!is_valid) {
            return reply.code(403).send({ success: false, result: "Invalid password." });
        }

        const res = await UserModel.user_delete(this.db, userId);
        reply.status(res.code).send(res);
    },

    async getUserMatchHistory(request, reply) {
        const user_id = request.params.id;
        const res = await UserModel.get_user_match_history(this.db, user_id);
        reply.code(res.code).send(res);
    },
};

module.exports = UserCtrl;
