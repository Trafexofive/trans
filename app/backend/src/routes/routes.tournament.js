const TournamentCtrl = require("../controllers/controllers.tournament");

async function TournamentRoutes(fastify) {
    const auth = { onRequest: [fastify.auth] };

    fastify.get("/", auth, TournamentCtrl.getAllTournaments);
    fastify.post("/", auth, TournamentCtrl.createTournament);
    fastify.get("/:id", auth, TournamentCtrl.getTournament);
    fastify.post("/:id/join", auth, TournamentCtrl.joinTournament);
    fastify.post("/:id/start", auth, TournamentCtrl.startTournament);
}

module.exports = TournamentRoutes;
