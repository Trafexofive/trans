const UserCtrl = require("../controllers/controllers.users");

function UserRoutes(fastify, options, done) {
    fastify.post("/", {
        schema: {
            body: {
                type: "object",
                required: ["name", "email", "password"],
                properties: {
                    name: { type: "string" },
                    email: { type: "string" },
                    password: { type: "string" },
                },
            },
        },
    }, UserCtrl.CreateUser);

    fastify.get("/", { onRequest: [fastify.auth] }, UserCtrl.GetAllUsers);
    fastify.get("/me", { onRequest: [fastify.auth] }, UserCtrl.GetMyProfile);
    fastify.get("/:id", { onRequest: [fastify.auth] }, UserCtrl.GetUserById);
    fastify.get(
        "/:id/matches",
        { onRequest: [fastify.auth] },
        UserCtrl.getUserMatchHistory,
    );
    fastify.delete("/:id", { onRequest: [fastify.auth] }, UserCtrl.DeleteUser);

    done();
}

module.exports = UserRoutes;
