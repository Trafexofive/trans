const fastify = require('fastify')({ logger: true });
const fastifyJwt = require('@fastify/jwt');
const fastifyWebSocket = require('@fastify/websocket');
const promClient = require('prom-client');
require('dotenv').config();
const axios = require('axios');
const crypto = require('crypto'); // Needed for random password generation

// --- Module Imports ---
const initDb = require('./models/models.init');
const UserModel = require('./models/models.users'); // Import UserModel
const RefreshTokenModel = require('./models/models.refresh_tokens'); // Import RefreshTokenModel
const { gen_jwt_token } = require('./utils/utils.security'); // Import JWT generator
const UserRoutes = require('./routes/routes.users');
const AuthRoutes =require('./routes/routes.auth');
const FriendshipRoutes = require('./routes/routes.friendships');
const ChatRoutes = require('./routes/routes.chat');
const GameRoutes = require('./routes/routes.game');
const TournamentRoutes = require('./routes/routes.tournament');

// ======================================================================================
// I. PLUGIN REGISTRATION (Order is Critical)
// ======================================================================================

fastify.register(require('./plugins/plugins.db'));
fastify.register(require('./plugins/plugins.auth'));
fastify.register(fastifyJwt, {
  secret: process.env.JWT_KEY,
});

fastify.register(fastifyWebSocket);

fastify.register(require('@fastify/cors'), {
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
});

fastify.register(require('@fastify/cookie'));

fastify.register(require('@fastify/session'), {
  secret: process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex'),
  cookie: {
    secure: false // Set to true if you're using HTTPS
  }
});

// --- OAUTH2 REGISTRATION ---
// The callbackUri is where Google sends the user BACK to your backend.
// The startRedirectPath is the URL the frontend will link to, to START the process.
fastify.register(require('@fastify/oauth2'), {
  name: 'googleOAuth2',
  scope: ['profile', 'email'],
  credentials: {
    client: {
      id: process.env.GOOGLE_CLIENT_ID,
      secret: process.env.GOOGLE_CLIENT_SECRET
    },
    auth: require('@fastify/oauth2').GOOGLE_CONFIGURATION
  },
  startRedirectPath: '/login/google',
  callbackUri: `http://localhost:${process.env.PORT || 3000}/login/google/callback`
});


// ======================================================================================
// I.A OAUTH2 CALLBACK HANDLER (The Core Logic)
// ======================================================================================

fastify.get('/login/google/callback', async function (request, reply) {
  const db = this.db;
  try {
      // 1. Exchange the authorization code from Google for an access token
      const { token } = await fastify.googleOAuth2.getAccessTokenFromAuthorizationCodeFlow(request);
      
      // 2. Use the token to get the user's info from Google
      const userInfoEndpoint = 'https://www.googleapis.com/oauth2/v2/userinfo';
      const { data: googleUser } = await axios.get(userInfoEndpoint, {
          headers: { 'Authorization': `Bearer ${token.access_token}` }
      });

      // 3. Find or Create a user in your local database
      let user;
      const existingUser = await UserModel.user_fetch_by_email(db, googleUser.email);
      
      if (existingUser.success) {
          user = existingUser.result;
          fastify.log.info(`OAuth: Existing user found: ${user.email}`);
      } else {
          fastify.log.info(`OAuth: No user found for ${googleUser.email}. Creating new user.`);
          const randomPassword = crypto.randomBytes(20).toString('hex');
          const newUser = await UserModel.user_create(
              db,
              googleUser.name,
              googleUser.email,
              randomPassword, // Satisfy NOT NULL constraint
              googleUser.picture // Use Google's avatar
          );
          if (!newUser.success) {
              throw new Error('Failed to create a new user during OAuth flow.');
          }
          const createdUser = await UserModel.user_fetch_by_email(db, googleUser.email);
          if (!createdUser.success) {
              throw new Error('Failed to fetch newly created user.');
          }
          user = createdUser.result;
      }

      // 4. Generate your application's own JWTs for the user
      await RefreshTokenModel.refresh_tokens_delete_by_id(db, user.id);
      const access_token = gen_jwt_token(this, user, process.env.ACCESS_TOKEN_EXPIRE);
      const refresh_token = gen_jwt_token(this, user, process.env.REFRESH_TOKEN_EXPIRE);
      await RefreshTokenModel.refresh_tokens_create(db, user.id, refresh_token);

      // 5. Redirect to a dedicated frontend page with tokens in the URL
      const frontendCallbackUrl = `http://localhost:${process.env.FRONTEND_HOST_PORT || 8080}/google-callback`;
      const redirectUrl = new URL(frontendCallbackUrl);
      redirectUrl.searchParams.append('access_token', access_token);
      redirectUrl.searchParams.append('refresh_token', refresh_token);
      
      reply.redirect(redirectUrl.toString());

  } catch (err) {
      console.error("OAuth Callback Error:", err);
      // Redirect to frontend login page with an error message
      const errorRedirectUrl = new URL(`http://localhost:${process.env.FRONTEND_HOST_PORT || 8080}/login`);
      errorRedirectUrl.searchParams.append('error', 'oauth_failed');
      reply.redirect(errorRedirectUrl.toString());
  }
});

// ======================================================================================
// II. METRICS & MONITORING
// ======================================================================================

const collectDefaultMetrics = promClient.collectDefaultMetrics;
collectDefaultMetrics();

const httpRequestDuration = new promClient.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
});
fastify.addHook('onResponse', (request, reply, done) => {
  if (request.routeOptions && request.routeOptions.url !== '/metrics') {
      httpRequestDuration
          .labels(request.method, request.routeOptions.url, reply.statusCode)
          .observe((reply.elapsedTime) / 1000);
  }
  done();
});
fastify.get('/metrics', async (request, reply) => {
  reply.header('Content-Type', promClient.register.contentType);
  return promClient.register.metrics();
});

// ======================================================================================
// III. DATABASE & ROUTE REGISTRATION
// ======================================================================================

initDb(fastify);

fastify.register(UserRoutes, { prefix: '/api/users' });
fastify.register(AuthRoutes, { prefix: '/api/auth' });
fastify.register(FriendshipRoutes, { prefix: '/api/friendships' });
fastify.register(ChatRoutes, { prefix: '/api/chat' });
fastify.register(GameRoutes, { prefix: '/api/game' });
fastify.register(TournamentRoutes, { prefix: '/api/tournaments' });

fastify.get('/health', async (request, reply) => {
  return { status: 'healthy' };
});

// ======================================================================================
// IV. SERVER STARTUP & SHUTDOWN
// ======================================================================================

async function start() {
  try {
    await fastify.listen({ host: '0.0.0.0', port: process.env.PORT || 3000 });
    fastify.log.info(`Server listening on port ${fastify.server.address().port}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
}
const listeners = ['SIGINT', 'SIGTERM'];
listeners.forEach((signal) => {
  process.on(signal, async () => {
    fastify.log.info('Shutdown signal received. Closing server...');
    await fastify.close();
    process.exit(0);
  });
});

start();
