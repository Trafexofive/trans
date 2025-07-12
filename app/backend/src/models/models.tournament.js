const TournamentModel = {
    tournaments_init() {
        return `CREATE TABLE IF NOT EXISTS tournaments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name VARCHAR(100) NOT NULL,
            creator_id INTEGER NOT NULL,
            status TEXT NOT NULL DEFAULT 'pending', -- pending, in_progress, completed
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (creator_id) REFERENCES users(id) ON DELETE CASCADE
        );`
    },

    participants_init() {
        return `CREATE TABLE IF NOT EXISTS tournament_participants (
            tournament_id INTEGER NOT NULL,
            user_id INTEGER NOT NULL,
            joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (tournament_id, user_id),
            FOREIGN KEY (tournament_id) REFERENCES tournaments(id) ON DELETE CASCADE,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );`
    },
    
    matches_init() {
        return `CREATE TABLE IF NOT EXISTS matches (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            tournament_id INTEGER NOT NULL,
            round_number INTEGER NOT NULL,
            player1_id INTEGER NOT NULL,
            player2_id INTEGER, -- Can be null for a bye
            winner_id INTEGER,
            status TEXT NOT NULL DEFAULT 'pending', -- pending, in_progress, completed
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (tournament_id) REFERENCES tournaments(id) ON DELETE CASCADE,
            FOREIGN KEY (player1_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (player2_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (winner_id) REFERENCES users(id) ON DELETE CASCADE
        );`
    },

    async tournament_get_all(db) {
        try {
            const stmt = db.prepare(`
                SELECT t.id, t.name, t.status, u.name as creator_name,
                (SELECT COUNT(*) FROM tournament_participants WHERE tournament_id = t.id) as participant_count
                FROM tournaments t
                JOIN users u ON t.creator_id = u.id
                WHERE t.status != 'completed'
                ORDER BY t.created_at DESC
            `);
            const res = await stmt.all();
            return { success: true, code: 200, result: res };
        } catch (err) {
            return { success: false, code: 500, result: err.message };
        }
    },

    async tournament_create(db, name, creator_id) {
        try {
            const stmt = db.prepare(`INSERT INTO tournaments (name, creator_id) VALUES (?, ?)`);
            const info = await stmt.run(name, creator_id);
            await this.tournament_add_participant(db, info.lastInsertRowid, creator_id);
            return { success: true, code: 201, result: { id: info.lastInsertRowid } };
        } catch (err) {
            return { success: false, code: 500, result: err.message };
        }
    },

    async tournament_add_participant(db, tournament_id, user_id) {
        try {
            const stmt = db.prepare(`INSERT INTO tournament_participants (tournament_id, user_id) VALUES (?, ?)`);
            await stmt.run(tournament_id, user_id);
            return { success: true, code: 201, result: "Joined successfully" };
        } catch (err) {
            if (err.code === 'SQLITE_CONSTRAINT_PRIMARYKEY') {
                return { success: false, code: 409, result: "User has already joined this tournament." };
            }
            return { success: false, code: 500, result: err.message };
        }
    },

    async tournament_get_participants(db, tournament_id) {
        try {
            const stmt = db.prepare(`
                SELECT u.id, u.name, u.avatar FROM users u
                JOIN tournament_participants tp ON u.id = tp.user_id
                WHERE tp.tournament_id = ?
            `);
            const res = await stmt.all(tournament_id);
            return { success: true, code: 200, result: res };
        } catch (err) {
            return { success: false, code: 500, result: err.message };
        }
    },
    
    async tournament_get_details(db, tournament_id) {
        try {
            const stmt = db.prepare(`SELECT * FROM tournaments WHERE id = ?`);
            const res = await stmt.get(tournament_id);
            return res ? { success: true, code: 200, result: res } : { success: false, code: 404, result: "Tournament not found" };
        } catch (err) {
            return { success: false, code: 500, result: err.message };
        }
    },

    async tournament_update_status(db, tournament_id, status) {
        try {
            const stmt = db.prepare(`UPDATE tournaments SET status = ? WHERE id = ?`);
            await stmt.run(status, tournament_id);
            return { success: true, code: 200, result: `Status updated to ${status}` };
        } catch(err) {
            return { success: false, code: 500, result: err.message };
        }
    },

    async match_create_bulk(db, tournament_id, matches) {
        try {
            const stmt = db.prepare(`INSERT INTO matches (tournament_id, round_number, player1_id, player2_id, status, winner_id) VALUES (?, ?, ?, ?, ?, ?)`);
            const insertTx = db.transaction(() => {
                for (const match of matches) {
                    const isBye = !match.player2;
                    const status = isBye ? 'completed' : 'pending';
                    const winner_id = isBye ? match.player1.id : null;
                    stmt.run(tournament_id, match.round, match.player1.id, match.player2?.id, status, winner_id);
                }
            });
            insertTx();
            // After creating a round, immediately check if it can be advanced (handles rounds with only byes)
            await this.checkAndAdvanceTournament(db, tournament_id);
            return { success: true, code: 201, result: "Matches created" };
        } catch (err) {
            console.error("Error in match_create_bulk:", err.message);
            return { success: false, code: 500, result: err.message };
        }
    },

    async tournament_get_matches(db, tournament_id) {
        try {
            const stmt = db.prepare(`
                SELECT 
                    m.id, m.round_number, m.status, m.winner_id,
                    p1.id as player1_id, p1.name as player1_name, p1.avatar as player1_avatar,
                    p2.id as player2_id, p2.name as player2_name, p2.avatar as player2_avatar
                FROM matches m
                JOIN users p1 ON m.player1_id = p1.id
                LEFT JOIN users p2 ON m.player2_id = p2.id
                WHERE m.tournament_id = ?
                ORDER BY m.round_number, m.id
            `);
            const res = await stmt.all(tournament_id);
            return { success: true, code: 200, result: res };
        } catch (err) {
            return { success: false, code: 500, result: err.message };
        }
    },

    async tournament_get_single_match(db, match_id) {
        try {
            const stmt = db.prepare(`SELECT * FROM matches WHERE id = ?`);
            const res = await stmt.get(match_id);
            return res ? { success: true, code: 200, result: res } : { success: false, code: 404, result: "Match not found" };
        } catch (err) {
            return { success: false, code: 500, result: err.message };
        }
    },

    async match_update_winner(db, match_id, winner_id) {
        try {
            const match = await this.tournament_get_single_match(db, match_id);
            if (!match.success || match.result.status === 'completed') {
                return { success: true, code: 200, result: "Match already completed or not found." };
            }
            
            const tournament_id = match.result.tournament_id;
            const updateStmt = db.prepare(`UPDATE matches SET winner_id = ?, status = 'completed' WHERE id = ?`);
            updateStmt.run(winner_id, match_id);

            await this.checkAndAdvanceTournament(db, tournament_id);
            return { success: true, code: 200, result: `Match ${match_id} updated.` };
        } catch (err) {
            console.error("Error in match_update_winner:", err.message);
            return { success: false, code: 500, result: err.message };
        }
    },

    async checkAndAdvanceTournament(db, tournament_id) {
        const allMatchesInTournament = db.prepare('SELECT * FROM matches WHERE tournament_id = ? ORDER BY round_number').all(tournament_id);
        if (allMatchesInTournament.length === 0) return;

        const latestRoundNumber = Math.max(...allMatchesInTournament.map(m => m.round_number));
        const latestRoundMatches = allMatchesInTournament.filter(m => m.round_number === latestRoundNumber);

        const isRoundComplete = latestRoundMatches.every(m => m.status === 'completed');

        if (isRoundComplete) {
            const winners = latestRoundMatches.map(m => m.winner_id).filter(id => id !== null);

            if (winners.length === 1 && latestRoundMatches.length >= 1) {
                await this.tournament_update_status(db, tournament_id, 'completed');
                console.log(`Tournament ${tournament_id} completed. Winner is user ${winners[0]}.`);
                return;
            } 
            
            if (winners.length > 1) {
                const shuffledWinners = winners.sort(() => 0.5 - Math.random());
                const newMatches = [];
                const nextRoundNum = latestRoundNumber + 1;
                for (let i = 0; i < shuffledWinners.length; i += 2) {
                    newMatches.push({ 
                        round: nextRoundNum, 
                        player1: { id: shuffledWinners[i] }, 
                        player2: shuffledWinners[i+1] ? { id: shuffledWinners[i+1] } : null 
                    });
                }

                if (newMatches.length > 0) {
                    console.log(`Advancing tournament ${tournament_id} to round ${nextRoundNum}.`);
                    await this.match_create_bulk(db, tournament_id, newMatches);
                }
            }
        }
    }
};

module.exports = TournamentModel;
