const Game = require('./Game');
const UserModel = require('../models/models.users');
const TournamentModel = require('../models/models.tournament');

const QUEUE_TIMEOUT = 60000; // 60 seconds
const QUEUE_CLEANUP_INTERVAL = 5000; // 5 seconds

class GameManager {
    constructor(db) {
        this.db = db;
        this.publicQueue = [];
        this.pendingGames = new Map(); // Stores players waiting for a tournament match
        this.activeGames = new Map();
        this.socketToPlayerId = new Map();
        console.log("GameManager initialized with queue and tournament handling.");
        this.startQueueCleanup();
    }

    startQueueCleanup() {
        setInterval(() => {
            const now = Date.now();
            const timedOutPlayers = [];
            
            this.publicQueue = this.publicQueue.filter(entry => {
                if (now - entry.joinedAt > QUEUE_TIMEOUT) {
                    timedOutPlayers.push(entry.player);
                    return false; // Remove from queue
                }
                return true; // Keep in queue
            });

            if (timedOutPlayers.length > 0) {
                console.log(`Timing out ${timedOutPlayers.length} players from queue.`);
                timedOutPlayers.forEach(player => {
                    try {
                        if (player.socket.readyState === 1) { // WebSocket.OPEN
                           player.socket.send(JSON.stringify({ type: 'queue_timeout' }));
                           player.socket.close();
                        }
                    } catch (e) {
                        console.error(`Error sending timeout to player ${player.id}:`, e.message);
                    }
                });
            }
        }, QUEUE_CLEANUP_INTERVAL);
    }

    handlePlayerConnection(player, matchId) {
        this.socketToPlayerId.set(player.socket, player.id);
        if (matchId) {
            this.handlePrivateMatchJoin(player, matchId);
        } else {
            this.handlePublicMatchJoin(player);
        }
    }

    handlePublicMatchJoin(player) {
        if (this.publicQueue.some(entry => entry.player.id === player.id)) {
            player.socket.send(JSON.stringify({ type: 'error', payload: 'You are already in the matchmaking queue.' }));
            return;
        }
        console.log(`Player ${player.name} (ID: ${player.id}) added to public queue.`);
        this.publicQueue.push({ player, joinedAt: Date.now() });
        this._tryStartPublicGame();
    }

    _tryStartPublicGame() {
        if (this.publicQueue.length >= 2) {
            const entry1 = this.publicQueue.shift();
            const entry2 = this.publicQueue.shift();
            const player1 = entry1.player;
            const player2 = entry2.player;

            if (!player1 || !player2 || player1.id === player2.id) {
                console.error("Matchmaking integrity error: Invalid players.");
                if(player1) this.publicQueue.unshift(entry1);
                if(player2) this.publicQueue.unshift(entry2);
                return;
            }

            console.log(`Public Match: ${player1.name} vs ${player2.name}`);
            const onGameOver = async (winnerId, loserId) => {
                await UserModel.user_add_win(this.db, winnerId);
                await UserModel.user_add_loss(this.db, loserId);
                console.log(`Public game over. Winner: ${winnerId}, Loser: ${loserId}. Stats updated.`);
            };
            
            const game = new Game(player1, player2, onGameOver);
            this.activeGames.set(player1.socket, game);
            this.activeGames.set(player2.socket, game);
            game.start();
        }
    }
    
    async handlePrivateMatchJoin(player, matchId) {
        const matchDetails = await TournamentModel.tournament_get_single_match(this.db, matchId);
        if (!matchDetails.success || !matchDetails.result) {
            return player.socket.send(JSON.stringify({ type: 'error', payload: 'Tournament match not found.' }));
        }

        const match = matchDetails.result;
        if (match.status !== 'pending') {
            return player.socket.send(JSON.stringify({ type: 'error', payload: `Match is already ${match.status}.` }));
        }
        if (player.id !== match.player1_id && player.id !== match.player2_id) {
            return player.socket.send(JSON.stringify({ type: 'error', payload: 'You are not a participant in this match.' }));
        }

        if (!this.pendingGames.has(matchId)) {
            this.pendingGames.set(matchId, [player]);
            player.socket.send(JSON.stringify({ type: 'waitingForOpponent' }));
            console.log(`Tournament Match ${matchId}: ${player.name} is waiting.`);
        } else {
            const waitingPlayer = this.pendingGames.get(matchId)[0];
            if (waitingPlayer.id === player.id) return; // Player reconnected, do nothing.

            const player1 = waitingPlayer;
            const player2 = player;
            this.pendingGames.delete(matchId);

            console.log(`Tournament Match ${matchId}: ${player1.name} vs ${player2.name}. Starting.`);

            const onGameOver = async (winnerId, loserId) => {
                await TournamentModel.match_update_winner(this.db, matchId, winnerId);
                await UserModel.user_add_win(this.db, winnerId);
                await UserModel.user_add_loss(this.db, loserId);
                console.log(`Tournament match ${matchId} over. Winner: ${winnerId}. Tournament advancing.`);
            };
            
            const game = new Game(player1, player2, onGameOver);
            this.activeGames.set(player1.socket, game);
            this.activeGames.set(player2.socket, game);
            game.start();
        }
    }

    removePlayer(socket) {
        const playerId = this.socketToPlayerId.get(socket);
        if (!playerId) return;

        // Remove from public queue if present
        const queueIndex = this.publicQueue.findIndex(entry => entry.player.id === playerId);
        if (queueIndex > -1) {
            this.publicQueue.splice(queueIndex, 1);
            console.log(`Player ${playerId} removed from public queue.`);
        }

        // Forfeit any active game
        const game = this.activeGames.get(socket);
        if (game && !game.isOver) {
            const opponent = game.player1.socket === socket ? game.player2 : game.player1;
            game.stop(opponent.id); // Forfeit to the opponent
            console.log(`Player ${playerId} disconnected. Forfeiting game.`);
        }
        
        // Cleanup maps
        if (game) {
            this.activeGames.delete(game.player1.socket);
            if (game.player2) this.activeGames.delete(game.player2.socket);
        }
        this.socketToPlayerId.delete(socket);
        
        console.log(`Player ${playerId} connection closed and cleaned up from all game activities.`);
    }
    
    handlePlayerInput(socket, data) {
        const game = this.activeGames.get(socket);
        const playerId = this.socketToPlayerId.get(socket);
        if (game && playerId) {
            game.handlePlayerInput(playerId, data);
        }
    }
}

module.exports = GameManager;
