const fastify = require("fastify")({ logger: true });
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const axios = require("axios");
const promClient = require("prom-client");
require("dotenv").config();

// Module Imports
const initDb = require("./models/models.init");
const UserModel = require("./models/models.users");
const RefreshTokenModel = require("./models/models.refresh_tokens");
const { gen_jwt_token } = require("./utils/utils.security");
const UserRoutes = require("./routes/routes.users");
const AuthRoutes = require("./routes/routes.auth");
const FriendshipRoutes = require("./routes/routes.friendships");
const ChatRoutes = require("./routes/routes.chat");
const GameRoutes = require("./routes/routes.game");
const TournamentRoutes = require("./routes/routes.tournament");

// Pre-startup directory creation
const publicDir = path.join(__dirname, "..", "public");
if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir, { recursive: true });
const avatarsDir = path.join(publicDir, "avatars");
if (!fs.existsSync(avatarsDir)) fs.mkdirSync(avatarsDir, { recursive: true });

// ======================================================================================
// I. PLUGIN REGISTRATION
// ======================================================================================

fastify.register(require("@fastify/multipart"));
fastify.register(require("@fastify/static"), {
    root: publicDir,
    prefix: "/",
});
fastify.register(require("./plugins/plugins.db"));
fastify.register(require("./plugins/plugins.auth"));
fastify.register(require("@fastify/jwt"), { secret: process.env.JWT_KEY });
fastify.register(require("@fastify/websocket"));
fastify.register(require("@fastify/cors"), {
    origin: process.env.CORS_ORIGIN || "http://localhost:8080",
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
});
fastify.register(require("@fastify/cookie"));
fastify.register(require("@fastify/session"), {
    secret: process.env.SESSION_SECRET ||
        crypto.randomBytes(32).toString("hex"),
    cookie: { secure: false },
});

const activeConnections = new Map();
fastify.decorate("activeConnections", activeConnections);

fastify.register(require("@fastify/oauth2"), {
    name: "googleOAuth2",
    scope: ["profile", "email"],
    credentials: {
        client: {
            id: process.env.GOOGLE_CLIENT_ID,
            secret: process.env.GOOGLE_CLIENT_SECRET,
        },
        auth: require("@fastify/oauth2").GOOGLE_CONFIGURATION,
    },
    startRedirectPath: "/login/google",
    callbackUri: `http://localhost:${
        process.env.PORT || 3000
    }/login/google/callback`,
});

// OAuth2 Callback Handler
fastify.get("/login/google/callback", async function (request, reply) {
    const db = this.db;
    try {
        const { token } = await fastify.googleOAuth2
            .getAccessTokenFromAuthorizationCodeFlow(request);
        const { data: googleUser } = await axios.get(
            "https://www.googleapis.com/oauth2/v2/userinfo",
            {
                headers: { "Authorization": `Bearer ${token.access_token}` },
            },
        );

        let user;
        const existingUser = await UserModel.user_fetch_by_email(
            db,
            googleUser.email,
        );

        if (existingUser.success) {
            user = existingUser.result;
        } else {
            const randomPassword = crypto.randomBytes(20).toString("hex");
            const newUserResult = await UserModel.user_create(
                db,
                googleUser.name || `user_${Date.now()}`,
                googleUser.email,
                randomPassword,
                googleUser.picture,
            );
            if (!newUserResult.success) {
                throw new Error("Failed to create new OAuth user.");
            }
            const createdUser = await UserModel.user_fetch_by_email(
                db,
                googleUser.email,
            );
            if (!createdUser.success) {
                throw new Error("Failed to fetch newly created OAuth user.");
            }
            user = createdUser.result;
        }

        await RefreshTokenModel.refresh_tokens_delete_by_id(db, user.id);
        const access_token = gen_jwt_token(
            this,
            user,
            process.env.ACCESS_TOKEN_EXPIRE,
        );
        const refresh_token = gen_jwt_token(
            this,
            user,
            process.env.REFRESH_TOKEN_EXPIRE,
        );
        await RefreshTokenModel.refresh_tokens_create(
            db,
            user.id,
            refresh_token,
        );

        const redirectUrl = new URL(
            `http://localhost:${
                process.env.FRONTEND_HOST_PORT || 8080
            }/google-callback`,
        );
        redirectUrl.searchParams.append("access_token", access_token);
        redirectUrl.searchParams.append("refresh_token", refresh_token);

        reply.redirect(redirectUrl.toString());
    } catch (err) {
        console.error("OAuth Callback Error:", err);
        reply.redirect(
            `http://localhost:${
                process.env.FRONTEND_HOST_PORT || 8080
            }/login?error=oauth_failed`,
        );
    }
});

// ======================================================================================
// II. METRICS, DATABASE, & ROUTE REGISTRATION
// ======================================================================================

promClient.collectDefaultMetrics();
const httpRequestDuration = new promClient.Histogram({
    name: "http_request_duration_seconds",
    help: "Duration of HTTP requests in seconds",
    labelNames: ["method", "route", "status_code"],
});
fastify.addHook("onResponse", (request, reply, done) => {
    if (request.routeOptions && request.routeOptions.url !== "/metrics") {
        httpRequestDuration.labels(
            request.method,
            request.routeOptions.url,
            reply.statusCode,
        ).observe(reply.elapsedTime / 1000);
    }
    done();
});
fastify.get("/metrics", async (request, reply) => {
    reply.header("Content-Type", promClient.register.contentType);
    return promClient.register.metrics();
});

initDb(fastify);
fastify.register(UserRoutes, { prefix: "/api/users" });
fastify.register(AuthRoutes, { prefix: "/api/auth" });
fastify.register(FriendshipRoutes, { prefix: "/api/friendships" });
fastify.register(ChatRoutes, { prefix: "/api/chat" });
fastify.register(GameRoutes, { prefix: "/api/game" });
fastify.register(TournamentRoutes, { prefix: "/api/tournaments" });
fastify.get("/health", async (request, reply) => ({ status: "healthy" }));

// ======================================================================================
// III. SERVER STARTUP
// ======================================================================================
const start = async () => {
    try {
        await fastify.listen({
            host: "0.0.0.0",
            port: process.env.PORT || 3000,
        });
    } catch (err) {
        fastify.log.error(err);
        process.exit(1);
    }
};

start();
