const path = require("path");
const os = require("os");
const dotenv = require("dotenv");
const { z } = require("zod");

dotenv.config({ path: path.join(__dirname, "..", ".env") });

// Older .env files used YoutubeAPI / OpenAIapiKey - keep accepting them.
const raw = {
    ...process.env,
    YOUTUBE_API_KEY: process.env.YOUTUBE_API_KEY || process.env.YoutubeAPI,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY || process.env.OpenAIapiKey,
};

const schema = z.object({
    PORT: z.coerce.number().int().positive().default(3035),
    YOUTUBE_API_KEY: z.string().trim().optional(),
    OPENAI_API_KEY: z.string().trim().optional(),
    OPENAI_MODEL: z.string().default("gpt-4o-mini"),
    // Comma-separated list. Defaults cover the Vite dev server and the Tauri webview.
    ALLOWED_ORIGINS: z.string().default(
        "http://localhost:5173,http://127.0.0.1:5173,tauri://localhost,http://tauri.localhost"
    ),
    // Browser yt-dlp reads cookies from to get past YouTube's bot checks
    // (and to unlock 256kbps streams on a YouTube Premium account). "none" disables it.
    YTDLP_COOKIES_BROWSER: z.string().default(process.platform === "darwin" ? "chrome" : "none"),
    DOWNLOAD_DIR: z.string().default(path.join(os.homedir(), "Downloads")),
    DOWNLOAD_CONCURRENCY: z.coerce.number().int().min(1).max(8).default(2),
    DOWNLOAD_TIMEOUT_SECONDS: z.coerce.number().int().positive().default(900),
    LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace"]).default("info"),
});

const parsed = schema.safeParse(raw);
if (!parsed.success) {
    console.error("Invalid backend configuration:", parsed.error.issues);
    process.exit(1);
}

const env = parsed.data;
env.ALLOWED_ORIGINS = env.ALLOWED_ORIGINS.split(",").map((o) => o.trim()).filter(Boolean);

module.exports = env;
