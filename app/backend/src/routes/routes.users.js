const UserCtrl = require("../controllers/controllers.users");

function UserRoutes(fastify, options, done) {
    const auth = { onRequest: [fastify.auth] };

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

    fastify.get("/", auth, UserCtrl.GetAllUsers);
    fastify.get("/me", auth, UserCtrl.GetMyProfile);
    fastify.put("/me", auth, UserCtrl.UpdateMyProfile);
    fastify.post("/me/avatar", auth, UserCtrl.UpdateMyAvatar);

    fastify.delete("/me", {
        ...auth,
        schema: {
            body: {
                type: "object",
                required: ["password"],
                properties: { password: { type: "string" } },
            },
        },
    }, UserCtrl.DeleteUser);

    fastify.get("/:id", auth, UserCtrl.GetUserById);
    fastify.get("/:id/matches", auth, UserCtrl.getUserMatchHistory);

    done();
}

module.exports = UserRoutes;
