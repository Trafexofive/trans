const TournamentCtrl = require('../controllers/controllers.tournament');

async function TournamentRoutes(fastify) {
    fastify.post('/', {
        onRequest: [fastify.auth],
        schema: {
            body: {
                type: 'object',
                required: ['name'],
                properties: { name: { type: 'string' } }
            }
        }
    }, TournamentCtrl.createTournament);

    fastify.get('/:id', {
        onRequest: [fastify.auth]
    }, TournamentCtrl.getTournament);
    
    fastify.post('/:id/join', {
        onRequest: [fastify.auth]
    }, TournamentCtrl.joinTournament);
    
    fastify.post('/:id/start', {
        onRequest: [fastify.auth]
    }, TournamentCtrl.startTournament);
}

module.exports = TournamentRoutes;
