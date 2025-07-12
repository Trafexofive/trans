const UserModel = require("./models.users");
const FriendshipModel = require("./models.friendships");
const RefreshtokenModel = require("./models.refresh_tokens");
const TwofaModel = require("./models.two_fa");
const ChatModel = require("./models.chat");
const TournamentModel = require("./models.tournament");
require("dotenv").config();

function initDb(fastify) {
    // This hook ensures that the following code runs only after the
    // plugin that decorates `fastify.db` has been loaded.
    fastify.after((err) => {
        if (err) throw err;

        fastify.db.exec(UserModel.users_init());
        fastify.db.exec(UserModel.users_index_email());
        fastify.db.exec(UserModel.users_index_name());

        fastify.db.exec(FriendshipModel.friendships_init());
        fastify.db.exec(FriendshipModel.friend_requests_init());
        fastify.db.exec(FriendshipModel.blocked_users_init());

        fastify.db.exec(RefreshtokenModel.refresh_tokens_init());
        fastify.db.exec(RefreshtokenModel.refresh_tokens_token_index());
        fastify.db.exec(RefreshtokenModel.refresh_tokens_user_index());

        fastify.db.exec(TwofaModel.two_fa_init());
        fastify.db.exec(TwofaModel.two_fa_user_index());

        fastify.db.exec(ChatModel.chat_init());
        fastify.db.exec(ChatModel.chat_sender_id_index());
        fastify.db.exec(ChatModel.chat_recipient_id_index());

        fastify.db.exec(TournamentModel.tournaments_init());
        fastify.db.exec(TournamentModel.participants_init());
        fastify.db.exec(TournamentModel.matches_init());

        console.log("Database tables initialized successfully.");
    });
}

module.exports = initDb;
