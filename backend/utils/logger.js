const pino = require("pino");
const env = require("../config/env");

module.exports = pino({
    level: env.LOG_LEVEL,
    // Never let API keys reach the logs, even via request/axios objects.
    redact: ["key", "*.key", "config.params.key", "headers.authorization"],
});
