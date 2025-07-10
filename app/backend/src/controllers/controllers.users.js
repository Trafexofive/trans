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
        const rawUserData = request.body;
        const { errors, sanitized, isValid } = validateAndSanitize(rawUserData);
        
        if (!isValid)
        {
            return reply.status(400).send({
                success: false,
                code: 400,
                result: errors.join(", ")
            })
        }
        
        
        const res = await UserModel.user_create(
            this.db,
            sanitized.name,
            sanitized.email,
            sanitized.password
        )

        reply.status(res.code).send(res);
    },

    async UpdateMyProfile(request, reply) {
        const userId = request.user.payload.id;
        const { name, email, password, avatar } = request.body;

        // input sanitizer
        const errors = check_and_sanitize({ name, email, password }, "ALL");
        if (errors.length !== 0) {
            return reply.status(400).send({
                success: false,
                code: 400,
                result: errors.join(", "),
            });
        }

        const res = await UserModel.user_update_profile(this.db, userId, {
            name,
            email,
            password,
            avatar,
        });
        reply.status(res.code).send(res);
    },

    async getUserMatchHistory(request, reply) {
        const user_id = request.params.id;
        const res = await UserModel.get_user_match_history(this.db, user_id);
        reply.code(res.code).send(res);
    },
};

module.exports = UserCtrl;
