const TournamentModel = require('../models/models.tournament');
const ChatModel = require('../models/models.chat');

const TournamentCtrl = {
    async getAllTournaments(request, reply) {
        const res = await TournamentModel.tournament_get_all(this.db);
        reply.code(res.code).send(res);
    },

    async createTournament(request, reply) {
        const { name } = request.body;
        const creator_id = request.user.payload.id;
        if (!name || name.trim().length === 0) {
            return reply.code(400).send({ success: false, result: "Tournament name is required." });
        }
        const res = await TournamentModel.tournament_create(this.db, name, creator_id);
        reply.code(res.code).send(res);
    },

    async joinTournament(request, reply) {
        const tournament_id = request.params.id;
        const user_id = request.user.payload.id;
        const res = await TournamentModel.tournament_add_participant(this.db, tournament_id, user_id);
        reply.code(res.code).send(res);
    },

    async getTournament(request, reply) {
        const tournament_id = request.params.id;
        const details = await TournamentModel.tournament_get_details(this.db, tournament_id);
        if (!details.success) return reply.code(details.code).send(details);
        
        const participants = await TournamentModel.tournament_get_participants(this.db, tournament_id);
        if (!participants.success) return reply.code(participants.code).send(participants);
        
        const matches = await TournamentModel.tournament_get_matches(this.db, tournament_id);
        if (!matches.success) return reply.code(matches.code).send(matches);

        reply.code(200).send({
            success: true,
            result: {
                details: details.result,
                participants: participants.result,
                matches: matches.result
            }
        });
    },

    async startTournament(request, reply) {
        const tournament_id = request.params.id;
        
        const tournamentDetails = await TournamentModel.tournament_get_details(this.db, tournament_id);
        if (!tournamentDetails.success || tournamentDetails.result.creator_id !== request.user.payload.id) {
            return reply.code(403).send({ success: false, result: "Only the creator can start the tournament." });
        }
        if (tournamentDetails.result.status !== 'pending') {
            return reply.code(400).send({ success: false, result: "Tournament has already started or is completed." });
        }

        const participantsRes = await TournamentModel.tournament_get_participants(this.db, tournament_id);
        if (!participantsRes.success) return reply.code(participantsRes.code).send(participantsRes);
        
        const participants = participantsRes.result;
        if (participants.length < 2) {
            return reply.code(400).send({ success: false, result: "At least 2 players are required to start." });
        }

        const shuffled = participants.sort(() => 0.5 - Math.random());
        const matches = [];
        for (let i = 0; i < shuffled.length; i += 2) {
            if (shuffled[i+1]) {
                matches.push({ round: 1, player1: shuffled[i], player2: shuffled[i+1] });
            } else {
                matches.push({ round: 1, player1: shuffled[i], player2: null });
            }
        }
        
        const createMatchesRes = await TournamentModel.match_create_bulk(this.db, tournament_id, matches);
        if (!createMatchesRes.success) return reply.code(createMatchesRes.code).send(createMatchesRes);

        const updateStatusRes = await TournamentModel.tournament_update_status(this.db, tournament_id, 'in_progress');
        reply.code(updateStatusRes.code).send({ success: true, result: "Tournament started!"});
    },
};

module.exports = TournamentCtrl;
