const GameManager = require("../game/GameManager");
let gameManager;

const GameCtrl = {
    GameSocket(socket, request) {
        if (!gameManager) {
            gameManager = new GameManager(this.db);
        }

        try {
            const { token, matchId } = request.query;
            if (!token) {
                return socket.close(4001, "Authentication token missing");
            }

            const decoded = request.server.jwt.verify(token);
            const user = decoded.payload;
            const player = { id: user.id, name: user.name, socket: socket };

            gameManager.handlePlayerConnection(player, matchId);

            socket.on("message", (data) => {
                const message = JSON.parse(data.toString());
                if (message.type === "paddleMove") {
                    gameManager.handlePlayerInput(socket, message.payload);
                }
            });

            socket.on("close", () => {
                gameManager.removePlayer(socket);
            });
        } catch (err) {
            console.error("Game WebSocket auth error:", err.message);
            socket.close(4002, "Invalid authentication token");
        }
    },
};

module.exports = GameCtrl;
