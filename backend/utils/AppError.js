// An error that is safe to show the client: a status, a stable code the UI can
// map to a friendly message, and a human-readable message.
class AppError extends Error {
    constructor(status, code, message, field) {
        super(message);
        this.status = status;
        this.code = code;
        this.field = field;
    }
}

module.exports = AppError;
