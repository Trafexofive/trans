const Game = require('./Game');
const UserModel = require('../models/models.users');
const TournamentModel = require('../models/models.tournament');

const QUEUE_TIMEOUT = 60000; // 60 seconds
const QUEUE_CLEANUP_INTERVAL = 5000; // 5 seconds

class GameManager {
    constructor(db) {
        this.db = db;
        this.publicQueue = [];
        this.pendingGames = new Map();
        this.activeGames = new Map();
        this.socketToPlayerId = new Map();
        console.log("GameManager initialized with queue timeout mechanism.");
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
        console.log(`Player ${player.name} (ID: ${player.id}) added to queue.`);
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
                console.error("Matchmaking integrity error: Attempted to match a player with themselves or invalid players.");
                if(player1) this.publicQueue.unshift(entry1);
                if(player2) this.publicQueue.unshift(entry2);
                return;
            }

            console.log(`Matchmaking success: Starting game between ${player1.name} (ID: ${player1.id}) and ${player2.name} (ID: ${player2.id})`);

            const onGameOver = async (winnerId, loserId) => {
                await UserModel.user_add_win(this.db, winnerId);
                await UserModel.user_add_loss(this.db, loserId);
                console.log(`Game over. Winner: ${winnerId}, Loser: ${loserId}. Stats updated.`);
            };
            
            const game = new Game(player1, player2, onGameOver);
            this.activeGames.set(player1.socket, game);
            this.activeGames.set(player2.socket, game);
            game.start();
        }
    }
    
    handlePrivateMatchJoin(player, matchId) {
        // This logic remains deferred as per the "Baseline" operation focus.
        console.log(`Private match join attempt for ${matchId} - functionality deferred.`);
        player.socket.send(JSON.stringify({ type: 'error', payload: 'Private matches are not yet enabled.' }));
    }

    removePlayer(socket) {
        const playerId = this.socketToPlayerId.get(socket);
        if (!playerId) return;

        const queueIndex = this.publicQueue.findIndex(entry => entry.player.id === playerId);
        if (queueIndex > -1) {
            this.publicQueue.splice(queueIndex, 1);
        }

        const game = this.activeGames.get(socket);
        if (game && !game.isOver) {
            const opponent = game.player1.socket === socket ? game.player2 : game.player1;
            if (opponent) {
                game.stop(opponent.id);
            }
        }
        
        if (game) {
            this.activeGames.delete(game.player1.socket);
            if (game.player2) {
                this.activeGames.delete(game.player2.socket);
            }
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
