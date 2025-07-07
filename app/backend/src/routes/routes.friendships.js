const FriendshipCtrl = require("../controllers/controllers.friendships");

async function FriendshipRoutes(fastify, options) {
    fastify.get("/", { onRequest: [fastify.auth] }, FriendshipCtrl.getFriends);
    fastify.get(
        "/ids",
        { onRequest: [fastify.auth] },
        FriendshipCtrl.getFriendIds,
    );
    fastify.delete(
        "/",
        { onRequest: [fastify.auth] },
        FriendshipCtrl.removeFriend,
    );

    fastify.get(
        "/user/:id",
        { onRequest: [fastify.auth] },
        FriendshipCtrl.getFriends,
    );

    fastify.get(
        "/requests",
        { onRequest: [fastify.auth] },
        FriendshipCtrl.getPendingRequests,
    );
    fastify.get(
        "/requests/statuses",
        { onRequest: [fastify.auth] },
        FriendshipCtrl.getAllRequestStatuses,
    );
    fastify.post(
        "/requests",
        { onRequest: [fastify.auth] },
        FriendshipCtrl.sendFriendRequest,
    );
    fastify.post(
        "/requests/:id/accept",
        { onRequest: [fastify.auth] },
        FriendshipCtrl.acceptFriendRequest,
    );
    fastify.delete(
        "/requests/:id/decline",
        { onRequest: [fastify.auth] },
        FriendshipCtrl.declineFriendRequest,
    );
    fastify.delete(
        "/requests/:id/cancel",
        { onRequest: [fastify.auth] },
        FriendshipCtrl.cancelFriendRequest,
    );

    // Blocking Workflow
    fastify.post(
        "/block",
        { onRequest: [fastify.auth] },
        FriendshipCtrl.blockUser,
    );
    fastify.delete(
        "/block",
        { onRequest: [fastify.auth] },
        FriendshipCtrl.unblockUser,
    );
    fastify.get(
        "/block/:id",
        { onRequest: [fastify.auth] },
        FriendshipCtrl.getBlockStatus,
    );
}

module.exports = FriendshipRoutes;
