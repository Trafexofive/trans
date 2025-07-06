const FriendshipCtrl = require('../controllers/controllers.friendships');

// Using the correct async function signature for a Fastify plugin
async function FriendshipRoutes(fastify, options) {
    // --- THIS IS THE FIX ---
    // These routes fetch data FOR THE LOGGED-IN USER, so they don't need an :id param.
    fastify.get('/', { onRequest: [fastify.auth] }, FriendshipCtrl.getFriends);
    fastify.get('/ids', { onRequest: [fastify.auth] }, FriendshipCtrl.getFriendIds);
    fastify.delete('/', { onRequest: [fastify.auth] }, FriendshipCtrl.removeFriend);

    // Routes for managing the friend request workflow
    fastify.get('/requests', { onRequest: [fastify.auth] }, FriendshipCtrl.getPendingRequests);
    fastify.get('/requests/statuses', { onRequest: [fastify.auth] }, FriendshipCtrl.getAllRequestStatuses);
    
    fastify.post('/requests', {
        onRequest: [fastify.auth],
        schema: { body: { type: 'object', required: ['receiver_id'], properties: { receiver_id: { type: 'integer' } } } }
    }, FriendshipCtrl.sendFriendRequest);
    
    fastify.post('/requests/:id/accept', { onRequest: [fastify.auth] }, FriendshipCtrl.acceptFriendRequest);
    fastify.delete('/requests/:id/decline', { onRequest: [fastify.auth] }, FriendshipCtrl.declineFriendRequest);
    fastify.delete('/requests/:id/cancel', { onRequest: [fastify.auth] }, FriendshipCtrl.cancelFriendRequest);
}

module.exports = FriendshipRoutes;
