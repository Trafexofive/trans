const fastify = require('fastify')({ logger: true });
const fastifyJwt = require('@fastify/jwt');
const fastifyWebSocket = require('@fastify/websocket');
const promClient = require('prom-client');
require('dotenv').config();
const axios = require('axios');

// --- Module Imports ---
const initDb = require('./models/models.init');
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
  secret: process.env.SESSION_SECRET,
  cookie: {
    secure: false // Set to true if you're using HTTPS
  }
});

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
  callbackUri: 'http://localhost:3000/login/google/callback'
});


fastify.get('/login/google/callback', async function (request, reply) {
  try {
      const { token } = await fastify.googleOAuth2.getAccessTokenFromAuthorizationCodeFlow(request);
      fastify.log.info('Access Token received, fetching user info...');
      const userInfoEndpoint = 'https://www.googleapis.com/oauth2/v2/userinfo';
      const { data: userInfo } = await axios.get(userInfoEndpoint, {
          headers: {
              'Authorization': `Bearer ${token.access_token}`
          }
      });
      fastify.log.info('Successfully fetched user info:');
      console.log(userInfo);
      reply.status(200).send({
          success: true,
          code: 200,
          result: userInfo
      });
  }
  catch (err)
  {
      console.log(err)
      if (err.response)
      {
          console.error('Error Response Data:\n', err);
      }
      reply.status(500).send({
          success: false,
          code: 500,
          result: 'An error occurred during authentication.'
      })
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
// =================================M=====================================================

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
