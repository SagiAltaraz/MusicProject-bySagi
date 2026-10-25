const { z } = require("zod");
const { streamChat, clearSession } = require("../services/ai");

const chatSchema = z.object({
    prompt: z.string({ error: "Prompt is required" }).trim().min(1, "Prompt is required").max(2000),
    sessionId: z.string().regex(/^[a-zA-Z0-9_-]{8,64}$/, "Invalid session id").default("anonymous-session"),
});

const clearSchema = z.object({
    sessionId: z.string().regex(/^[a-zA-Z0-9_-]{8,64}$/, "Invalid session id"),
});

// Streams Server-Sent Events when the client asks for them, else returns plain JSON.
const ask = async (req, res, next) => {
    const { prompt, sessionId } = req.valid;
    const wantsStream = req.get("accept")?.includes("text/event-stream");
    const abort = new AbortController();
    // "close" on the response (not the request) fires when the client goes away mid-stream
    res.on("close", () => abort.abort());

    if (!wantsStream) {
        try {
            const response = await streamChat({ sessionId, prompt, signal: abort.signal, onToken: () => {} });
            return res.json({ response });
        } catch (err) {
            return next(err);
        }
    }

    res.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
    });
    const send = (event, data) => res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);

    try {
        await streamChat({ sessionId, prompt, signal: abort.signal, onToken: (t) => send("token", t) });
        send("done", {});
    } catch (err) {
        send("error", { error: err.message, code: err.code || "INTERNAL" });
    }
    res.end();
};

const clear = (req, res) => {
    clearSession(req.valid.sessionId);
    res.json({ ok: true });
};

module.exports = { ask, clear, chatSchema, clearSchema };
