const path = require("path");
const os = require("os");
const fs = require("fs");
const { spawn } = require("child_process");

// Common install locations so yt-dlp/ffmpeg resolve even when the server is
// launched from an IDE/GUI whose PATH is missing Homebrew / Python bin dirs.
const EXTRA_BIN_DIRS = [
    "/opt/homebrew/bin",
    "/usr/local/bin",
    "/Library/Frameworks/Python.framework/Versions/3.13/bin",
    path.join(os.homedir(), ".local/bin"),
];

const SPAWN_PATH = [...EXTRA_BIN_DIRS, process.env.PATH || ""].join(":");

// Resolve ffmpeg location (yt-dlp needs it for the mp3 conversion)
const FFMPEG_CANDIDATES = ["/opt/homebrew/bin/ffmpeg", "/usr/local/bin/ffmpeg"];
const ffmpegPath = FFMPEG_CANDIDATES.find((p) => fs.existsSync(p));

// yt-dlp needs a JavaScript runtime to solve YouTube's signature / "n" challenges,
// and only deno is enabled by default. Without one, extraction silently degrades
// to lower-quality formats (and needs the yt-dlp-ejs solver script installed).
const JS_RUNTIME_CANDIDATES = [
    ["deno", "/opt/homebrew/bin/deno"],
    ["node", "/opt/homebrew/bin/node"],
    ["node", "/usr/local/bin/node"],
    ["bun", path.join(os.homedir(), ".bun/bin/bun")],
];
const jsRuntime = JS_RUNTIME_CANDIDATES.find(([, p]) => fs.existsSync(p));

// YouTube gates every player client behind anti-bot checks: the web clients demand
// a PO token ("Sign in to confirm you're not a bot"), tv/web_safari return DRM-only
// formats, and the android_vr fallback serves URLs that reply 403 - the usual cause
// of "yt-dlp exited with code 1". Real browser cookies are the supported way through.
// Set YTDLP_COOKIES_BROWSER=none to disable, or to another browser (firefox, edge...).
const cookiesBrowser = process.env.YTDLP_COOKIES_BROWSER || "chrome";

// YouTube's best stream is Opus at 48kHz (float when decoded). DJ gear is safest at
// 44.1kHz/16-bit, so lossless outputs are resampled once with soxr and TPDF-dithered.
// No gain, compression or normalisation is applied - the audio itself is untouched.
const PCM_ARGS = "ExtractAudio:-af aresample=44100:resampler=soxr:precision=28:osf=s16:dither_method=triangular";

// Output profiles. WAV/AIFF are lossless containers: they stop any further loss
// (no second lossy encode) but cannot add detail the YouTube source never had.
const FORMATS = {
    // CBR 320 (not "--audio-quality 0", which is VBR V0) for exact seeking on CDJs.
    mp3: ["--audio-format", "mp3", "--audio-quality", "320K",
        "--postprocessor-args", "ExtractAudio:-ar 44100",
        "--embed-thumbnail", "--convert-thumbnails", "jpg"],
    wav: ["--audio-format", "wav", "--postprocessor-args", PCM_ARGS],
    // AIFF keeps ID3 tags that Rekordbox/Serato read; the best lossless choice for DJs.
    // yt-dlp can't write AIFF, so it produces the WAV and toAiff() remuxes it.
    aiff: ["--audio-format", "wav", "--postprocessor-args", PCM_ARGS],
};

// Bit-identical PCM (little- to big-endian), only the container and tags change.
const toAiff = (wavPath, aiffPath, done) => {
    const ffmpeg = spawn(ffmpegPath || "ffmpeg", [
        "-v", "error", "-y", "-i", wavPath,
        "-map_metadata", "0", "-c:a", "pcm_s16be", "-write_id3v2", "1",
        aiffPath,
    ], { env: { ...process.env, PATH: SPAWN_PATH } });
    let stderr = "";
    ffmpeg.stderr.on("data", (d) => { stderr += d; });
    ffmpeg.on("error", (err) => done(err));
    ffmpeg.on("close", (code) => {
        fs.rm(wavPath, { force: true }, () => {});
        done(code === 0 ? null : new Error(stderr.trim() || `ffmpeg exited with code ${code}`));
    });
};

const downloadFromYoutube = (req, res) => {
    const { videoId, title } = req.query;
    const format = req.query.format || "mp3";

    if (!videoId || !/^[a-zA-Z0-9_-]{11}$/.test(videoId)) {
        return res.status(400).json({ error: "Valid video ID is required" });
    }
    if (!FORMATS[format]) {
        return res.status(400).json({ error: `Format must be one of: ${Object.keys(FORMATS).join(", ")}` });
    }

    // Strips non-ASCII, so a fully non-Latin title (Hebrew, etc.) sanitises to ""
    // and would produce a hidden "~/Downloads/.mp3" - fall back to the video ID.
    const safeTitle = (title || videoId)
        .replace(/[^a-zA-Z0-9\s-]/g, "")
        .replace(/\s+/g, " ")
        .trim() || videoId;

    const downloadFolder = path.join(os.homedir(), "Downloads");
    const fileName = `${safeTitle}.${format}`;
    const outputPath = path.join(downloadFolder, fileName);

    // AIFF goes through an intermediate WAV; name it apart so an existing
    // "<title>.wav" the user already downloaded isn't overwritten and deleted.
    const baseName = format === "aiff" ? `${safeTitle}.aiff-tmp` : safeTitle;

    console.log("Downloading to", outputPath);

    const args = [
        "-x",
        "-f", "bestaudio/best",
        ...FORMATS[format],
        "--embed-metadata",
        // Let yt-dlp name the pre-conversion file; the final extension is the format.
        "-o", path.join(downloadFolder, `${baseName}.%(ext)s`),
    ];
    if (ffmpegPath) {
        args.push("--ffmpeg-location", ffmpegPath);
    }
    if (jsRuntime) {
        const [name, runtimePath] = jsRuntime;
        args.push("--js-runtimes", `${name}:${runtimePath}`);
    }
    if (cookiesBrowser !== "none") {
        args.push("--cookies-from-browser", cookiesBrowser);
    }
    args.push(`https://www.youtube.com/watch?v=${videoId}`);

    const ytdlProcess = spawn("yt-dlp", args, {
        env: { ...process.env, PATH: SPAWN_PATH },
    });

    // Without this handler an ENOENT (yt-dlp not installed / not on PATH) is
    // thrown as an unhandled 'error' event and crashes the whole server.
    ytdlProcess.on("error", (err) => {
        console.error("Failed to start yt-dlp:", err.message);
        if (!res.headersSent) {
            if (err.code === "ENOENT") {
                return res.status(500).json({
                    error: "yt-dlp not found. Install it (e.g. `brew install yt-dlp` or `pip install yt-dlp`) and make sure it's on the server's PATH.",
                });
            }
            res.status(500).json({ error: "Failed to start download process" });
        }
    });

    // Keep the last ERROR line so a failure reports *why*, not just the exit code.
    let lastError = "";
    ytdlProcess.stderr.on("data", (data) => {
        const text = data.toString().trim();
        console.error("yt-dlp:", text);
        for (const line of text.split("\n")) {
            if (line.startsWith("ERROR:")) lastError = line.replace(/^ERROR:\s*/, "");
        }
    });

    ytdlProcess.on("close", (code) => {
        if (res.headersSent) return; // an 'error' already responded
        if (code === 0) {
            console.log("Download completed", outputPath);
            // Stream the file to the browser so the <a download> anchor saves it
            const send = () => res.download(outputPath, fileName, (err) => {
                if (err) {
                    console.error("Error sending file:", err);
                    if (!res.headersSent) res.status(500).json({ error: "Download failed" });
                }
            });
            if (format !== "aiff") return send();
            toAiff(path.join(downloadFolder, `${baseName}.wav`), outputPath, (err) => {
                if (!err) return send();
                console.error("AIFF conversion failed:", err.message);
                res.status(500).json({ error: `AIFF conversion failed: ${err.message}` });
            });
        } else {
            res.status(500).json({
                error: lastError
                    ? `Download failed: ${lastError}`
                    : `Download failed (yt-dlp exited with code ${code})`,
            });
        }
    });
};

module.exports = { downloadFromYoutube };
