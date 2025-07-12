const fp = require("fastify-plugin");
const Database = require("better-sqlite3");

function dbPlugin(fastify, options, done) {
    const db = new Database(process.env.DB_PATH || "database.db");
    fastify.decorate("db", db);

    fastify.addHook("onClose", (instance, done) => {
        instance.db.close();
        done();
    });

    done(); 
}

module.exports = fp(dbPlugin);
