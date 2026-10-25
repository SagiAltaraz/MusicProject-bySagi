const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const compression = require("compression");
const env = require("./config/env");
const logger = require("./utils/logger");
const { binaries, INSTALL_HINT } = require("./utils/binaries");
const limits = require("./middleware/rateLimits");
const { notFound, errorHandler } = require("./middleware/errorHandler");
const routes = require("./routes");

const app = express();

app.use(helmet({
    // The frontend runs on another origin (Vite / Tauri) and fetches files from here
    crossOriginResourcePolicy: { policy: "cross-origin" },
}));
app.use(cors({
    // Requests without an Origin (curl, same-origin) are allowed; browsers must be listed.
    origin: (origin, cb) => cb(null, !origin || env.ALLOWED_ORIGINS.includes(origin)),
    exposedHeaders: ["Content-Disposition", "X-Track-Info"],
}));
// SSE streams must not be buffered by compression
app.use(compression({ filter: (req, res) => !String(res.getHeader("Content-Type") || "").includes("text/event-stream") && compression.filter(req, res) }));
app.use(express.json({ limit: "100kb" }));
app.use(limits.general);

app.use(routes);
app.use(notFound);
app.use(errorHandler);

const missing = Object.entries(binaries).filter(([, p]) => !p).map(([name]) => name);
if (missing.length) logger.warn(`Missing ${missing.join(", ")} - downloads will fail. ${INSTALL_HINT}`);
if (!env.YOUTUBE_API_KEY) logger.warn("YOUTUBE_API_KEY is not set - search is disabled.");
if (!env.OPENAI_API_KEY) logger.warn("OPENAI_API_KEY is not set - the AI assistant is disabled.");

const server = app.listen(env.PORT, () => {
    logger.info(`Server is running on → http://localhost:${env.PORT}`);
});

const shutdown = (signal) => {
    logger.info(`${signal} received, shutting down`);
    server.close(() => process.exit(0));
    // Long downloads / SSE streams shouldn't block exit forever
    setTimeout(() => process.exit(0), 5000).unref();
};
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

module.exports = app;
