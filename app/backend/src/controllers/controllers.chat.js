const ChatModel = require("../models/models.chat");
const FriendshipModel = require("../models/models.friendships");
const UserModel = require("../models/models.users");

const ChatCtl = {
    async ChatSocket(socket, request) {
        const token = request.query.token;
        if (!token) return socket.close(4001, "Authentication token missing");

        try {
            const decoded = await request.server.jwt.verify(token);
            const userId = decoded.payload.id;

            if (this.activeConnections.has(userId)) {
                this.activeConnections.get(userId).close(
                    4009,
                    "Replaced by new connection",
                );
            }
            this.activeConnections.set(userId, socket);

            const unread = await ChatModel.chat_get_unread(this.db, userId);
            if (unread.success && unread.result.length > 0) {
                unread.result.forEach((msg) =>
                    socket.send(JSON.stringify(msg))
                );
                await ChatModel.chat_mark_delivered_bulk(this.db, userId);
            }

            socket.on("message", async (rawMessage) => {
                try {
                    const message = JSON.parse(rawMessage.toString());
                    if (!message.to || !message.content) return;

                    const blockCheck = await FriendshipModel.check_block(
                        this.db,
                        userId,
                        message.to,
                    );
                    if (blockCheck.result) return;

                     // sanitize and validate message against xss
                     const { sanitized, isValid } = check_and_sanitize({ message: message.content });
                     if (!isValid) {
                         socket.send(JSON.stringify({ error: "Invalid message." }));
                         return;
                     }

                    const recipientSocket = this.activeConnections.get(
                        message.to,
                    );
                    const isDelivered = !!recipientSocket &&
                        recipientSocket.readyState === recipientSocket.OPEN;

                    const savedMessage = await ChatModel.chat_create(this.db, {
                        sender_id: userId,
                        recipient_id: message.to,
                        message: sanitized.message,
                        is_delivered: isDelivered ? 1 : 0,
                        delivered_at: isDelivered
                            ? new Date().toISOString()
                            : null,
                    });

                    if (savedMessage.success) {
                        const fullNewMessage = await ChatModel
                            .chat_get_message_by_db_id(
                                this.db,
                                savedMessage.result,
                            );
                        if (fullNewMessage.success) {
                            const messageToSend = JSON.stringify(
                                fullNewMessage.result,
                            );
                            if (isDelivered) {
                                recipientSocket.send(messageToSend);
                            }
                            socket.send(messageToSend); // Echo back to sender
                        }
                    }
                } catch (err) {
                    console.error("Error processing message:", err);
                }
            });

            socket.on("close", () => {
                if (this.activeConnections.get(userId) === socket) {
                    this.activeConnections.delete(userId);
                }
            });
        } catch (err) {
            console.error("WebSocket auth error:", err.message);
            socket.close(4002, "Invalid authentication token");
        }
    },

    async ChatHistory(request, reply) {
        const senderId = request.user.payload.id;
        const recId = request.params.id;
        const rec_check = await UserModel.user_fetch(this.db, recId);
        if (!rec_check.success) {
            return reply.code(404).send({
                success: false,
                result: "Recipient not found",
            });
        }
        const res = await ChatModel.chat_get_by_id(this.db, senderId, recId);
        reply.code(res.code).send(res);
    },

    async ChatProfiles(request, reply) {
        const res = await ChatModel.chat_get_profiles(
            this.db,
            request.user.payload.id,
        );
        reply.code(res.code).send(res);
    },
};

module.exports = ChatCtl;
