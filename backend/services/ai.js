const OpenAI = require("openai");
const { LRUCache } = require("lru-cache");
const env = require("../config/env");
const AppError = require("../utils/AppError");

const client = env.OPENAI_API_KEY ? new OpenAI({ apiKey: env.OPENAI_API_KEY }) : null;

const DJ_SYSTEM_PROMPT = `You are DJ Crate AI - an expert music assistant built for DJs.
Your knowledge covers: BPM, musical keys, genres, mixing techniques, harmonic mixing (Camelot wheel),
track selection, set building, crowd reading, and music discovery.

Rules:
- Keep answers concise and practical - DJs need quick info.
- Use Markdown. When suggesting tracks, ALWAYS format each one on its own line as a numbered list item
  exactly like "1. Artist - Title" (optionally followed by " — 124 BPM, 8A"), so the app can turn them into buttons.
- If asked about BPM/key compatibility, reference the Camelot wheel.
- Suggest real, well-known tracks that actually exist. Never invent tracks.
- When suggesting a set flow, describe energy levels (low → peak → cool down).
- If asked for genre recommendations, suggest specific sub-genres and key artists.`;

const MAX_HISTORY = 20;

// One bounded history per browser session; idle sessions expire so memory stays flat.
const sessions = new LRUCache({ max: 500, ttl: 2 * 60 * 60 * 1000, updateAgeOnGet: true });

/**
 * Stream a chat reply. Calls onToken for each text delta and resolves with the full reply.
 */
const streamChat = async ({ sessionId, prompt, signal, onToken }) => {
    if (!client) {
        throw new AppError(500, "AI_KEY_MISSING", "Missing OPENAI_API_KEY in backend/.env.");
    }

    const history = sessions.get(sessionId) || [];
    const messages = [...history, { role: "user", content: prompt }].slice(-MAX_HISTORY);

    let reply = "";
    try {
        const stream = await client.chat.completions.create({
            model: env.OPENAI_MODEL,
            messages: [{ role: "system", content: DJ_SYSTEM_PROMPT }, ...messages],
            max_tokens: 700,
            temperature: 0.7,
            stream: true,
        }, { signal });

        for await (const chunk of stream) {
            const delta = chunk.choices[0]?.delta?.content;
            if (delta) {
                reply += delta;
                onToken(delta);
            }
        }
    } catch (err) {
        if (signal?.aborted) return reply;
        throw new AppError(502, "AI_UNAVAILABLE", "AI service unavailable. Please try again.");
    }

    sessions.set(sessionId, [...messages, { role: "assistant", content: reply }].slice(-MAX_HISTORY));
    return reply;
};

const clearSession = (sessionId) => sessions.delete(sessionId);

module.exports = { streamChat, clearSession };
