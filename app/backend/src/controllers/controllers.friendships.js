const FriendshipModel = require("../models/models.friendships");

function notifyUsers(connectionMap, userIds, message) {
    const uniqueUserIds = [...new Set(userIds)];
    uniqueUserIds.forEach((id) => {
        const socket = connectionMap.get(id);
        if (socket && socket.readyState === 1) { // WebSocket.OPEN
            socket.send(message);
        }
    });
}

const FriendshipCtrl = {
    async getFriends(request, reply) {
        const user_id = request.params.id || request.user.payload.id;
        const res = await FriendshipModel.get_friends(this.db, user_id);
        reply.code(res.code).send(res);
    },

    async getFriendIds(request, reply) {
        const user_id = request.user.payload.id;
        const res = await FriendshipModel.get_friend_ids(this.db, user_id);
        reply.code(res.code).send(res);
    },

    async getBlockedUsers(request, reply) {
        const user_id = request.user.payload.id;
        const res = await FriendshipModel.get_blocked_ids(this.db, user_id);
        reply.code(res.code).send(res);
    },

    async blockUser(request, reply) {
        const blocker_id = request.user.payload.id;
        const { blocked_id } = request.body;

        await FriendshipModel.remove_friend(this.db, blocker_id, blocked_id);
        const res = await FriendshipModel.block_user(
            this.db,
            blocker_id,
            blocked_id,
        );

        if (res.success) {
            // Send a generic social update to both users to refresh lists.
            notifyUsers(
                this.activeConnections,
                [blocker_id, blocked_id],
                JSON.stringify({ type: "social_update" }),
            );

            // Send a specific "you were blocked" notification to the target user.
            const blockedSocket = this.activeConnections.get(blocked_id);
            if (blockedSocket && blockedSocket.readyState === 1) {
                blockedSocket.send(JSON.stringify({
                    type: "user_blocked",
                    payload: { blockerName: request.user.payload.name },
                }));
            }
        }
        reply.code(res.code).send(res);
    },

    async removeFriend(request, reply) {
        const user_id = request.user.payload.id;
        const friend_id = parseInt(request.params.friend_id, 10);
        const res = await FriendshipModel.remove_friend(
            this.db,
            user_id,
            friend_id,
        );
        if (res.success) {
            notifyUsers(
                this.activeConnections,
                [user_id, friend_id],
                JSON.stringify({ type: "social_update" }),
            );
        }
        reply.code(res.code).send(res);
    },

    async sendFriendRequest(request, reply) {
        const sender_id = request.user.payload.id;
        const { receiver_id } = request.body;
        if (sender_id === receiver_id) {
            return reply.code(400).send({
                success: false,
                result: "You cannot send a request to yourself.",
            });
        }
        const res = await FriendshipModel.create_friend_request(
            this.db,
            sender_id,
            receiver_id,
        );
        if (res.success) {
            notifyUsers(
                this.activeConnections,
                [sender_id, receiver_id],
                JSON.stringify({ type: "social_update" }),
            );
        }
        reply.code(res.code).send(res);
    },

    async getPendingRequests(request, reply) {
        const res = await FriendshipModel.get_pending_requests(
            this.db,
            request.user.payload.id,
        );
        reply.code(res.code).send(res);
    },

    async acceptFriendRequest(request, reply) {
        const receiver_id = request.user.payload.id;
        const request_id = parseInt(request.params.id, 10);
        const requestDetails = await FriendshipModel.get_request_details(
            this.db,
            request_id,
        );
        if (
            !requestDetails.success ||
            requestDetails.result.receiver_id !== receiver_id
        ) {
            return reply.code(404).send({
                success: false,
                result: "Request not found or permission denied.",
            });
        }
        const res = await FriendshipModel.accept_friend_request(
            this.db,
            request_id,
            receiver_id,
        );
        if (res.success) {
            notifyUsers(this.activeConnections, [
                requestDetails.result.sender_id,
                receiver_id,
            ], JSON.stringify({ type: "social_update" }));
        }
        reply.code(res.code).send(res);
    },

    async declineFriendRequest(request, reply) {
        const receiver_id = request.user.payload.id;
        const request_id = parseInt(request.params.id, 10);
        const requestDetails = await FriendshipModel.get_request_details(
            this.db,
            request_id,
        );
        if (
            !requestDetails.success ||
            requestDetails.result.receiver_id !== receiver_id
        ) {
            return reply.code(404).send({
                success: false,
                result: "Request not found.",
            });
        }
        const res = await FriendshipModel.decline_friend_request(
            this.db,
            request_id,
            receiver_id,
        );
        if (res.success) {
            notifyUsers(this.activeConnections, [
                requestDetails.result.sender_id,
                receiver_id,
            ], JSON.stringify({ type: "social_update" }));
        }
        reply.code(res.code).send(res);
    },

    async cancelFriendRequest(request, reply) {
        const sender_id = request.user.payload.id;
        const request_id = parseInt(request.params.id, 10);
        const requestDetails = await FriendshipModel.get_request_details(
            this.db,
            request_id,
        );
        if (
            !requestDetails.success ||
            requestDetails.result.sender_id !== sender_id
        ) {
            return reply.code(404).send({
                success: false,
                result: "Request not found or permission denied.",
            });
        }
        const res = await FriendshipModel.cancel_friend_request(
            this.db,
            request_id,
            sender_id,
        );
        if (res.success) {
            notifyUsers(this.activeConnections, [
                sender_id,
                requestDetails.result.receiver_id,
            ], JSON.stringify({ type: "social_update" }));
        }
        reply.code(res.code).send(res);
    },

    async getAllRequestStatuses(request, reply) {
        const res = await FriendshipModel.get_all_request_statuses(
            this.db,
            request.user.payload.id,
        );
        reply.code(res.code).send(res);
    },

    async unblockUser(request, reply) {
        const blocker_id = request.user.payload.id;
        const blocked_id = parseInt(request.params.blocked_id, 10);
        const res = await FriendshipModel.unblock_user(
            this.db,
            blocker_id,
            blocked_id,
        );
        if (res.success) {
            notifyUsers(
                this.activeConnections,
                [blocker_id, blocked_id],
                JSON.stringify({ type: "social_update" }),
            );
        }
        reply.code(res.code).send(res);
    },

    async getBlockStatus(request, reply) {
        const blocker_id = request.user.payload.id;
        const blocked_id = request.params.id;
        const res = await this.db.prepare(
            `SELECT 1 FROM blocked_users WHERE blocker_id = ? AND blocked_id = ?`,
        ).get(blocker_id, blocked_id);
        reply.send({ success: true, result: { isBlocked: !!res } });
    },
};

module.exports = FriendshipCtrl;
