const FriendshipModel = require("../models/models.friendships");

const FriendshipCtrl = {
    // This is the primary function for fetching a friend list.
    // If the request has a URL parameter, it fetches for that user ID.
    // Otherwise, it fetches for the authenticated user making the request.
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
    async removeFriend(request, reply) {
        const user_id = request.user.payload.id;
        const { friend_id } = request.body;
        const res = await FriendshipModel.remove_friend(
            this.db,
            user_id,
            friend_id,
        );
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
        const res = await FriendshipModel.accept_friend_request(
            this.db,
            request.params.id,
            request.user.payload.id,
        );
        reply.code(res.code).send(res);
    },
    async declineFriendRequest(request, reply) {
        const res = await FriendshipModel.decline_friend_request(
            this.db,
            request.params.id,
            request.user.payload.id,
        );
        reply.code(res.code).send(res);
    },
    async cancelFriendRequest(request, reply) {
        const res = await FriendshipModel.cancel_friend_request(
            this.db,
            request.params.id,
            request.user.payload.id,
        );
        reply.code(res.code).send(res);
    },
    async getAllRequestStatuses(request, reply) {
        const res = await FriendshipModel.get_all_request_statuses(
            this.db,
            request.user.payload.id,
        );
        reply.code(res.code).send(res);
    },
    async blockUser(request, reply) {
        const { blocked_id } = request.body;
        await FriendshipModel.remove_friend(
            this.db,
            request.user.payload.id,
            blocked_id,
        );
        const res = await FriendshipModel.block_user(
            this.db,
            request.user.payload.id,
            blocked_id,
        );
        reply.code(res.code).send(res);
    },
    async unblockUser(request, reply) {
        const { blocked_id } = request.body;
        const res = await FriendshipModel.unblock_user(
            this.db,
            request.user.payload.id,
            blocked_id,
        );
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
