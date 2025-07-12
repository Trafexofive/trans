const ChatCtl = require("../controllers/controllers.chat");

async function ChatRoutes(fastify) {
    fastify.get("/socket", {
        // Authentication is now correctly handled inside the ChatSocket controller
        // by reading the token from the query parameter.
        websocket: true,
    }, ChatCtl.ChatSocket);

    fastify.get("/:id", {
        onRequest: [fastify.auth],
    }, ChatCtl.ChatHistory);

    fastify.get("/", {
        onRequest: [fastify.auth],
    }, ChatCtl.ChatProfiles);
}

module.exports = ChatRoutes;
