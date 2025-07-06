const ChatModel = require('../models/models.chat')
const UserModel = require('../models/models.users')

const activeConnections = new Map()

const ChatCtl = {

	async ChatSocket(socket, request) {
        const token = request.query.token;
        if (!token) {
            socket.close(4001, 'Authentication token missing');
            return;
        }

        try {
            const decoded = await request.server.jwt.verify(token);
            const payload = decoded.payload;
            const userId = payload.id;

            if (activeConnections.has(userId)) {
                const oldSocket = activeConnections.get(userId);
                oldSocket.close(4009, 'Replaced by new connection');
            }

            activeConnections.set(userId, socket);

            // Fetch and send unread messages upon connection
            const unread = await ChatModel.chat_get_unread(this.db, userId);
            if (unread.success && unread.result.length > 0) {
                unread.result.forEach(msg => {
                    socket.send(JSON.stringify(msg));
                });
                await ChatModel.chat_mark_delivered_bulk(this.db, userId);
            }

            socket.on('message', async (rawMessage) => {
                try {
                    const message = JSON.parse(rawMessage.toString());
                    if (!message.to || !message.content) return;

                    const recipientSocket = activeConnections.get(message.to);
                    const isDelivered = (recipientSocket && recipientSocket.readyState === recipientSocket.OPEN);

                    // --- THE FIX: Save, refetch with ID, then broadcast ---
                    const savedMessage = await ChatModel.chat_create(this.db, {
                        sender_id: userId,
                        recipient_id: message.to,
                        message: message.content,
                        is_delivered: isDelivered ? 1 : 0,
                        delivered_at: isDelivered ? new Date().toISOString() : null
                    });
                    
                    if (savedMessage.success) {
                        const fullNewMessage = await ChatModel.chat_get_message_by_db_id(this.db, savedMessage.result);

                        if (fullNewMessage.success) {
                            const messageToSend = JSON.stringify(fullNewMessage.result);
                            if (isDelivered) {
                                recipientSocket.send(messageToSend);
                            }
                            // Also send the final message back to the sender
                            socket.send(messageToSend);
                        }
                    }

                } catch (err) {
                    console.error('Error processing message:', err);
                }
            });

            socket.on('close', () => {
                if (activeConnections.get(userId) === socket) {
                    activeConnections.delete(userId);
                }
            });

        } catch (err) {
            console.error('WebSocket auth error:', err.message);
            socket.close(4002, 'Invalid authentication token');
        }
	},

	async ChatHistory(request, reply) {
		const authHeader = request.headers.authorization;
        const token = authHeader.split(' ')[1];
        const decoded = await request.jwtVerify(token);
        const payload = decoded.payload;
		const senderId = payload.id;
		const recId = request.params.id;

		const rec_check = await UserModel.user_fetch(this.db, recId);
		if (!rec_check.success) {
			return reply.status(404).send({ success: false, code: 404, result: "Recipient not found" });
		}
		const res = await ChatModel.chat_get_by_id(this.db, senderId, recId);
		reply.code(res.code).send(res);
	},

	async ChatProfiles(request, reply) {
		const authHeader = request.headers.authorization;
        const token = authHeader.split(' ')[1];
        const decoded = await request.jwtVerify(token);
        const payload = decoded.payload;
		const senderId = payload.id;
		
		const res = await ChatModel.chat_get_profiles(this.db, senderId);
		reply.code(res.code).send(res);
	}
}

module.exports = ChatCtl;
