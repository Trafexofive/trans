const FriendshipModel = require("../models/models.friendships");

const FriendshipCtrl = {
    sendFriendRequest: async (request, reply) => {
        const sender_id = request.user.payload.id;
        const { receiver_id } = request.body;
        if (sender_id === receiver_id) {
            return reply.code(400).send({
                success: false,
                result: "You cannot send a request to yourself.",
            });
        }
        reply.send(
            await FriendshipModel.create_friend_request(
                this.db,
                sender_id,
                receiver_id,
            ),
        );
    },
    getPendingRequests: async (request, reply) => {
        reply.send(
            await FriendshipModel.get_pending_requests(
                this.db,
                request.user.payload.id,
            ),
        );
    },
    acceptFriendRequest: async (request, reply) => {
        reply.send(
            await FriendshipModel.accept_friend_request(
                this.db,
                request.params.id,
                request.user.payload.id,
            ),
        );
    },
    declineFriendRequest: async (request, reply) => {
        reply.send(
            await FriendshipModel.decline_friend_request(
                this.db,
                request.params.id,
                request.user.payload.id,
            ),
        );
    },
    cancelFriendRequest: async (request, reply) => {
        reply.send(
            await FriendshipModel.cancel_friend_request(
                this.db,
                request.params.id,
                request.user.payload.id,
            ),
        );
    },
    removeFriend: async (request, reply) => {
        reply.send(
            await FriendshipModel.remove_friend(
                this.db,
                request.user.payload.id,
                request.body.friend_id,
            ),
        );
    },
    getFriends: async (request, reply) => {
        reply.send(
            await FriendshipModel.get_friends(this.db, request.user.payload.id),
        );
    },
    getFriendIds: async (request, reply) => {
        reply.send(
            await FriendshipModel.get_friend_ids(
                this.db,
                request.user.payload.id,
            ),
        );
    },
    getAllRequestStatuses: async (request, reply) => {
        reply.send(
            await FriendshipModel.get_all_request_statuses(
                this.db,
                request.user.payload.id,
            ),
        );
    },
    blockUser: async (request, reply) => {
        const { blocked_id } = request.body;
        await FriendshipModel.remove_friend(
            this.db,
            request.user.payload.id,
            blocked_id,
        );
        reply.send(
            await FriendshipModel.block_user(
                this.db,
                request.user.payload.id,
                blocked_id,
            ),
        );
    },
    unblockUser: async (request, reply) => {
        reply.send(
            await FriendshipModel.unblock_user(
                this.db,
                request.user.payload.id,
                request.body.blocked_id,
            ),
        );
    },
    getBlockStatus: async (request, reply) => {
        const blocker_id = request.user.payload.id;
        const blocked_id = request.params.id;
        const res = await this.db.prepare(
            `SELECT 1 FROM blocked_users WHERE blocker_id = ? AND blocked_id = ?`,
        ).get(blocker_id, blocked_id);
        reply.send({ success: true, result: { isBlocked: !!res } });
    },
};

module.exports = FriendshipCtrl;
