const env = require("../config/env");
const { describeBinaries } = require("../utils/binaries");

// Diagnostics for the Settings page: tool versions and which features are configured.
const health = (req, res) => {
    const tools = describeBinaries();
    res.json({
        ok: Boolean(tools.ytdlp.path && tools.ffmpeg.path && tools.ffprobe.path),
        tools,
        features: {
            search: Boolean(env.YOUTUBE_API_KEY),
            assistant: Boolean(env.OPENAI_API_KEY),
            cookiesBrowser: env.YTDLP_COOKIES_BROWSER,
        },
        downloadDir: env.DOWNLOAD_DIR,
    });
};

module.exports = { health };
