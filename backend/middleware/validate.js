const AppError = require("../utils/AppError");

// Parses req[source] with a zod schema and stores the typed result on req.valid.
const validate = (schema, source = "query") => (req, res, next) => {
    const result = schema.safeParse(req[source] ?? {});
    if (!result.success) {
        const issue = result.error.issues[0];
        const field = issue.path.join(".");
        return next(new AppError(400, "INVALID_INPUT", issue.message, field));
    }
    req.valid = result.data;
    next();
};

module.exports = validate;
