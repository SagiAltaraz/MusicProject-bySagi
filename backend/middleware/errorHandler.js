const logger = require("../utils/logger");
const AppError = require("../utils/AppError");

const notFound = (req, res, next) => next(new AppError(404, "NOT_FOUND", `No route for ${req.method} ${req.path}`));

// eslint-disable-next-line no-unused-vars -- Express needs the 4-arg signature
const errorHandler = (err, req, res, next) => {
    const status = err instanceof AppError ? err.status : 500;
    if (status >= 500) logger.error({ err: err.message, path: req.path }, "request failed");
    if (res.headersSent) return;
    res.status(status).json({
        error: err instanceof AppError ? err.message : "Something went wrong on the server.",
        code: err instanceof AppError ? err.code : "INTERNAL",
        ...(err.field && { field: err.field }),
    });
};

module.exports = { notFound, errorHandler };
