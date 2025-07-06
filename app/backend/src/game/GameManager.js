const Game = require('./Game');
const UserModel = require('../models/models.users');
const TournamentModel = require('../models/models.tournament');

class GameManager {
    constructor(db) {
        this.db = db;

        this.publicQueue = [];      // For public matchmaking
        this.pendingGames = new Map();  // For private tournament matches
        this.activeGames = new Map();   // Keyed by a player's socket
        this.socketToPlayerId = new Map();
        console.log("GameManager initialized to support Public and Private matches.");
    }
    
    // --- NEW: Main entry point for any player connection ---
    handlePlayerConnection(player, matchId) {
        this.socketToPlayerId.set(player.socket, player.id);

        if (matchId) {
            // --- Private Match Logic ---
            this.handlePrivateMatchJoin(player, matchId);
        } else {
            // --- Public Matchmaking Logic ---
            this.handlePublicMatchJoin(player);
        }
    }

    handlePublicMatchJoin(player) {
        console.log(`Player ${player.name} added to public matchmaking queue.`);
        this.publicQueue.push(player);
        this._tryStartPublicGame();
    }

    handlePrivateMatchJoin(player, matchId) {
        console.log(`Player ${player.name} attempting to join private match ${matchId}.`);
        if (this.pendingGames.has(matchId)) {
            const game = this.pendingGames.get(matchId);
            game.addPlayer(player);
            
            if (game.isReady()) {
                this.pendingGames.delete(matchId);
                this.activeGames.set(game.player1.socket, game);
                this.activeGames.set(game.player2.socket, game);
                game.start();
            }
        } else {
            const onGameOver = async (winnerId, loserId, matchId) => {
                await UserModel.user_add_win(this.db, winnerId);
                await UserModel.user_add_loss(this.db, loserId);
                // Only update tournament if a matchId was provided
                if (matchId) {
                    await TournamentModel.match_update_winner(this.db, matchId, winnerId);
                }
                this.cleanupGame(matchId);
            };
            const game = new Game(player, null, onGameOver, matchId);
            this.pendingGames.set(matchId, game);
        }
    }

    _tryStartPublicGame() {
        if (this.publicQueue.length >= 2) {
            console.log("Two players in public queue. Starting new game.");
            const player1 = this.publicQueue.shift();
            const player2 = this.publicQueue.shift();

            const onGameOver = async (winnerId, loserId) => {
                await UserModel.user_add_win(this.db, winnerId);
                await UserModel.user_add_loss(this.db, loserId);
                // No matchId to cleanup for public games
            };
            
            const game = new Game(player1, player2, onGameOver, null); // No matchId for public games
            this.activeGames.set(player1.socket, game);
            this.activeGames.set(player2.socket, game);
            game.start();
        }
    }

    cleanupGame(matchId) {
        // Safe cleanup for all games
        this.activeGames.forEach((g, socket) => {
            if (g.matchId === matchId) {
                this.activeGames.delete(socket);
            }
        });
    }

    removePlayer(socket) {
        const game = this.activeGames.get(socket);
        if (game) {
            if (!game.isOver) {
                game.stop();
            }
            this.activeGames.delete(socket);
        }

        // Remove from public queue if they are there
        const playerId = this.socketToPlayerId.get(socket);
        if(playerId) {
            this.publicQueue = this.publicQueue.filter(p => p.id !== playerId);
            this.socketToPlayerId.delete(socket);
        }
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
