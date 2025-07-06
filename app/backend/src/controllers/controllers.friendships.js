const FriendshipModel = require("../models/models.friendships");

const FriendshipCtrl = {
    async sendFriendRequest(request, reply) {
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
    async getPendingRequests(request, reply) {
        reply.send(
            await FriendshipModel.get_pending_requests(
                this.db,
                request.user.payload.id,
            ),
        );
    },
    async acceptFriendRequest(request, reply) {
        reply.send(
            await FriendshipModel.accept_friend_request(
                this.db,
                request.params.id,
                request.user.payload.id,
            ),
        );
    },
    async declineFriendRequest(request, reply) {
        reply.send(
            await FriendshipModel.decline_friend_request(
                this.db,
                request.params.id,
                request.user.payload.id,
            ),
        );
    },
    async cancelFriendRequest(request, reply) {
        reply.send(
            await FriendshipModel.cancel_friend_request(
                this.db,
                request.params.id,
                request.user.payload.id,
            ),
        );
    },
    async removeFriend(request, reply) {
        reply.send(
            await FriendshipModel.remove_friend(
                this.db,
                request.user.payload.id,
                request.body.friend_id,
            ),
        );
    },
    async getFriends(request, reply) {
        reply.send(
            await FriendshipModel.get_friends(this.db, request.user.payload.id),
        );
    },
    async getFriendIds(request, reply) {
        reply.send(
            await FriendshipModel.get_friend_ids(
                this.db,
                request.user.payload.id,
            ),
        );
    },
    async getAllRequestStatuses(request, reply) {
        reply.send(
            await FriendshipModel.get_all_request_statuses(
                this.db,
                request.user.payload.id,
            ),
        );
    },
    async blockUser(request, reply) {
        const blocker_id = request.user.payload.id;
        const { blocked_id } = request.body;
        reply.send(
            await FriendshipModel.block_user(this.db, blocker_id, blocked_id),
        );
    },
    async unblockUser(request, reply) {
        const blocker_id = request.user.payload.id;
        const { blocked_id } = request.body;
        reply.send(
            await FriendshipModel.unblock_user(this.db, blocker_id, blocked_id),
        );
    },
};

module.exports = FriendshipCtrl;
