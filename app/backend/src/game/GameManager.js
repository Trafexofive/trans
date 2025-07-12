const Game = require("./Game");
const UserModel = require("../models/models.users");
const TournamentModel = require("../models/models.tournament");

class GameManager {
    constructor(db) {
        this.db = db;
        this.publicQueue = [];
        this.pendingGames = new Map();
        // Maps a player's socket to their active game instance for input handling.
        this.activeGamesBySocket = new Map();
        // Maps a unique match ID to its game instance for spectator lookups.
        this.activeGamesById = new Map();
        // Maps a socket to a player's user ID for quick identification on disconnect.
        this.socketToPlayerId = new Map();
        console.log(
            "GameManager initialized with spectator and tournament handling.",
        );
    }

    handlePlayerConnection(player, matchId, isSpectator = false) {
        this.socketToPlayerId.set(player.socket, player.id);

        if (isSpectator) {
            if (!matchId) {
                player.socket.send(
                    JSON.stringify({
                        type: "error",
                        payload: "Match ID is required for spectating.",
                    }),
                );
                player.socket.close();
                return;
            }
            this.handleSpectatorJoin(player, matchId);
            return;
        }

        if (matchId) {
            this.handlePrivateMatchJoin(player, matchId);
        } else {
            this.handlePublicMatchJoin(player);
        }
    }

    handleSpectatorJoin(spectator, matchId) {
        const game = this.activeGamesById.get(matchId);
        if (game && !game.isOver) {
            game.addSpectator(spectator.socket);
            console.log(`Spectator ${spectator.id} joined match ${matchId}`);
        } else {
            spectator.socket.send(
                JSON.stringify({
                    type: "error",
                    payload: "Match not found or has already ended.",
                }),
            );
            spectator.socket.close();
        }
    }

    async handlePrivateMatchJoin(player, matchId) {
        const matchDetails = await TournamentModel.tournament_get_single_match(
            this.db,
            matchId,
        );
        if (!matchDetails.success || !matchDetails.result) {
            return player.socket.send(
                JSON.stringify({
                    type: "error",
                    payload: "Tournament match not found.",
                }),
            );
        }

        const match = matchDetails.result;
        if (match.status !== "pending") {
            return player.socket.send(
                JSON.stringify({
                    type: "error",
                    payload: `Match is already ${match.status}.`,
                }),
            );
        }
        if (player.id !== match.player1_id && player.id !== match.player2_id) {
            return player.socket.send(
                JSON.stringify({
                    type: "error",
                    payload: "You are not a participant in this match.",
                }),
            );
        }

        if (!this.pendingGames.has(matchId)) {
            this.pendingGames.set(matchId, [player]);
            player.socket.send(JSON.stringify({ type: "waitingForOpponent" }));
        } else {
            const waitingPlayer = this.pendingGames.get(matchId)[0];
            if (waitingPlayer.id === player.id) return;

            const player1 = waitingPlayer;
            const player2 = player;
            this.pendingGames.delete(matchId);

            const onGameOver = async (winnerId, loserId) => {
                await TournamentModel.match_update_winner(
                    this.db,
                    matchId,
                    winnerId,
                );
                await UserModel.user_add_win(this.db, winnerId);
                await UserModel.user_add_loss(this.db, loserId);
                this.activeGamesById.delete(matchId);
            };

            const game = new Game(player1, player2, onGameOver, matchId);
            this.activeGamesBySocket.set(player1.socket, game);
            this.activeGamesBySocket.set(player2.socket, game);
            this.activeGamesById.set(matchId, game);
            game.start();
        }
    }

    _tryStartPublicGame() {
        if (this.publicQueue.length >= 2) {
            const player1 = this.publicQueue.shift().player;
            const player2 = this.publicQueue.shift().player;

            // Create a unique, predictable ID for public matches for spectator lookup.
            const matchId = `public-${Date.now()}-${player1.id}-${player2.id}`;
            const onGameOver = async (winnerId, loserId) => {
                await UserModel.user_add_win(this.db, winnerId);
                await UserModel.user_add_loss(this.db, loserId);
                this.activeGamesById.delete(matchId); // Clean up from ID map on game end.
            };

            const game = new Game(player1, player2, onGameOver, matchId);
            this.activeGamesBySocket.set(player1.socket, game);
            this.activeGamesBySocket.set(player2.socket, game);
            this.activeGamesById.set(matchId, game);
            game.start();
        }
    }

    handlePublicMatchJoin(player) {
        if (this.publicQueue.some((entry) => entry.player.id === player.id)) {
            player.socket.send(
                JSON.stringify({
                    type: "error",
                    payload: "You are already in the matchmaking queue.",
                }),
            );
            return;
        }
        this.publicQueue.push({ player });
        this._tryStartPublicGame();
    }

    removePlayer(socket) {
        const playerId = this.socketToPlayerId.get(socket);
        if (!playerId) return;

        // Remove from public queue if present.
        this.publicQueue = this.publicQueue.filter((entry) =>
            entry.player.id !== playerId
        );

        const game = this.activeGamesBySocket.get(socket);
        if (game) {
            // If the socket belongs to a player in an active game.
            if (!game.isOver) {
                const opponent = game.player1.socket === socket
                    ? game.player2
                    : game.player1;
                game.stop(opponent.id); // Forfeit to the opponent.
            }
            this.activeGamesBySocket.delete(game.player1.socket);
            if (game.player2) {
                this.activeGamesBySocket.delete(game.player2.socket);
            }
        } else {
            // If not a player, they might be a spectator. Check all active games.
            this.activeGamesById.forEach((gameInstance) => {
                gameInstance.removeSpectator(socket);
            });
        }

        this.socketToPlayerId.delete(socket);
    }

    handlePlayerInput(socket, data) {
        const game = this.activeGamesBySocket.get(socket);
        const playerId = this.socketToPlayerId.get(socket);
        if (game && playerId) {
            game.handlePlayerInput(playerId, data);
        }
    }
}

module.exports = GameManager;
