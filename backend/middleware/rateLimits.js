const rateLimit = require("express-rate-limit");

const limiter = (windowMinutes, limit, message) => rateLimit({
    windowMs: windowMinutes * 60 * 1000,
    limit,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    message: { error: message, code: "RATE_LIMITED" },
});

module.exports = {
    general: limiter(15, 600, "Too many requests, slow down a little."),
    downloads: limiter(10, 40, "Too many downloads at once. Wait a few minutes and try again."),
    ai: limiter(1, 15, "The assistant needs a short break. Try again in a minute."),
};
