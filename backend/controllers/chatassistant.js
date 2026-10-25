const OpenAI = require("openai");
const path = require("path");
const dotenv = require("dotenv");

dotenv.config({ path: path.join(__dirname, "..", ".env") });

const openai = new OpenAI({ apiKey: process.env.OpenAIapiKey });

const DJ_SYSTEM_PROMPT = `You are DJ Crate AI — an expert music assistant built for DJs.
Your knowledge covers: BPM, musical keys, genres, mixing techniques, harmonic mixing (Camelot wheel),
track selection, set building, crowd reading, and music discovery.

Rules:
- Keep answers concise and practical — DJs need quick info.
- When suggesting tracks, format them as a numbered list with artist - title.
- If asked about BPM/key compatibility, reference the Camelot wheel.
- Suggest real, well-known tracks that actually exist.
- When suggesting a set flow, describe energy levels (low → peak → cool down).
- If asked for genre recommendations, suggest specific sub-genres and key artists.
- Be enthusiastic about music but stay professional.`;

const conversationHistory = new Map();

const askFromAI = async (req, res) => {
    const { prompt, sessionId = "default" } = req.body;
    if (!prompt) {
        return res.status(400).json({ error: "Prompt is required" });
    }

    try {
        // Maintain conversation context per session
        if (!conversationHistory.has(sessionId)) {
            conversationHistory.set(sessionId, []);
        }
        const history = conversationHistory.get(sessionId);
        history.push({ role: "user", content: prompt });

        // Keep last 20 messages to avoid token overflow
        const recentHistory = history.slice(-20);

        const completion = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                { role: "system", content: DJ_SYSTEM_PROMPT },
                ...recentHistory,
            ],
            max_tokens: 500,
            temperature: 0.7,
        });

        const response = completion.choices[0].message.content;
        history.push({ role: "assistant", content: response });

        return res.json({ response });
    } catch (error) {
        console.error("Error with OpenAI API:", error.message);
        res.status(500).json({ error: "AI service unavailable. Please try again." });
    }
};

module.exports = { askFromAI };
