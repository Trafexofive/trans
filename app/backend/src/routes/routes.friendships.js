const FriendshipCtrl = require("../controllers/controllers.friendships");

async function FriendshipRoutes(fastify, options) {
    const auth = { onRequest: [fastify.auth] };

    // --- Get Friend Lists ---
    fastify.get("/", auth, FriendshipCtrl.getFriends);
    fastify.get("/user/:id", auth, FriendshipCtrl.getFriends);
    fastify.get("/ids", auth, FriendshipCtrl.getFriendIds);

    // --- Friend Request Workflow ---
    fastify.get("/requests", auth, FriendshipCtrl.getPendingRequests);
    fastify.get(
        "/requests/statuses",
        auth,
        FriendshipCtrl.getAllRequestStatuses,
    );
    fastify.post("/requests", auth, FriendshipCtrl.sendFriendRequest);
    fastify.post(
        "/requests/:id/accept",
        auth,
        FriendshipCtrl.acceptFriendRequest,
    );
    fastify.delete(
        "/requests/:id/decline",
        auth,
        FriendshipCtrl.declineFriendRequest,
    );
    fastify.delete(
        "/requests/:id/cancel",
        auth,
        FriendshipCtrl.cancelFriendRequest,
    );

    // --- Blocking Workflow ---
    fastify.get("/blocked", auth, FriendshipCtrl.getBlockedUsers); // <<< NEW
    fastify.get("/block/:id", auth, FriendshipCtrl.getBlockStatus);
    fastify.post("/block", auth, FriendshipCtrl.blockUser);
    fastify.delete("/block/:blocked_id", auth, FriendshipCtrl.unblockUser);

    // --- Remove a Friend (Keep last for parameter specificity) ---
    fastify.delete("/:friend_id", auth, FriendshipCtrl.removeFriend);
}

module.exports = FriendshipRoutes;
