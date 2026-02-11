const path = require("path");
const os = require("os");
const { spawn } = require("child_process");

const downloadFromYoutube = async (req, res) => {
    const { videoId, title } = req.query;

    if (!videoId || !/^[a-zA-Z0-9_-]{11}$/.test(videoId)) {
        return res.status(400).json({ error: "Valid video ID is required" });
    }

    const safeTitle = (title || videoId)
        .replace(/[^a-zA-Z0-9\s-]/g, "")
        .replace(/\s+/g, " ")
        .trim();

    const downloadFolder = path.join(os.homedir(), "Downloads");
    const outputPath = path.join(downloadFolder, `${safeTitle}.mp3`);

    console.log("Downloading to", outputPath);

    const ytdlProcess = spawn("yt-dlp", [
        "-x",
        "--audio-format", "mp3",
        "--audio-quality", "0",
        "-o", outputPath,
        "--ffmpeg-location", "/opt/homebrew/bin/ffmpeg",
        `https://www.youtube.com/watch?v=${videoId}`,
    ]);

    ytdlProcess.stderr.on("data", (data) => {
        console.error("yt-dlp error:", data.toString());
    });

    ytdlProcess.on("close", (code) => {
        if (code === 0) {
            console.log("Download completed", outputPath);
            res.json({ success: true, message: "Download completed", path: outputPath });
        } else {
            res.status(500).json({ error: "Download failed" });
        }
    });
};

module.exports = { downloadFromYoutube };
