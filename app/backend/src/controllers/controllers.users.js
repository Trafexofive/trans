const { check_and_sanitize } = require("../utils/utils.security");
const UserModel = require("../models/models.users");

const UserCtrl = {
    async GetAllUsers(request, reply) {
        const res = await UserModel.user_all(this.db);
        reply.status(res.code).send(res);
    },

    async GetUserById(request, reply) {
        const id = request.params.id;
        const res = await UserModel.user_fetch(this.db, id);
        reply.status(res.code).send(res);
    },

    async GetMyProfile(request, reply) {
        const userId = request.user.payload.id;
        const res = await UserModel.user_fetch(this.db, userId);
        reply.status(res.code).send(res);
    },

    async CreateUser(request, reply) {
        const { name, email, password } = request.body;
        const errors = check_and_sanitize({ name, email, password });
        if (errors.length !== 0) {
            return reply.status(400).send({
                success: false,
                result: errors.join(", "),
            });
        }
        const res = await UserModel.user_create(this.db, name, email, password);
        reply.status(res.code).send(res);
    },

    async UpdateMyProfile(request, reply) {
        const userId = request.user.payload.id;
        const { name, avatar } = request.body;

        if (!name && !avatar) {
            return reply.status(400).send({
                success: false,
                result: "Name or avatar must be provided.",
            });
        }

        const res = await UserModel.user_update_profile(this.db, userId, {
            name,
            avatar,
        });
        reply.status(res.code).send(res);
    },

    async DeleteUser(request, reply) {
        // Note: UserModel.user_delete is not yet implemented in the model.
        // This will be a future task. For now, this route is unused.
        // TODO: Implement user deletion in UserModel.
        const id = request.params.id;
        // const res = await UserModel.user_delete(this.db, id);
        // reply.status(res.code).send(res);
        reply.status(501).send({
            success: false,
            result: "Delete functionality not implemented.",
        });
    },

    async getUserMatchHistory(request, reply) {
        const user_id = request.params.id;
        const res = await UserModel.get_user_match_history(this.db, user_id);
        reply.code(res.code).send(res);
    },
};

module.exports = UserCtrl;
