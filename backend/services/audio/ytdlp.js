const fs = require("fs/promises");
const path = require("path");
const { LRUCache } = require("lru-cache");
const env = require("../../config/env");
const AppError = require("../../utils/AppError");
const { binaries, jsRuntime, INSTALL_HINT } = require("../../utils/binaries");
const { run } = require("./process");
const { gradeSource } = require("./profiles");
const { parseArtistTitle } = require("./filename");

const videoUrl = (id) => `https://www.youtube.com/watch?v=${id}`;
const probeCache = new LRUCache({ max: 300, ttl: 30 * 60 * 1000 });

// Translate yt-dlp's stderr into a stable code + a message a DJ can act on.
const ERROR_PATTERNS = [
    [/could not (find|copy).*cookie|failed to decrypt|cookies database|keyring/i, "COOKIES",
        "Couldn't read browser cookies. Close the browser or set YTDLP_COOKIES_BROWSER (or none) in backend/.env."],
    [/not a bot|sign in to confirm you/i, "BOT_CHECK",
        "YouTube wants a signed-in browser. Sign in to YouTube in the cookies browser and try again."],
    [/confirm your age|age[- ]restricted|inappropriate for some users/i, "AGE_RESTRICTED",
        "This video is age-restricted. Sign in to YouTube in the cookies browser to download it."],
    [/not available in your country|blocked it in your country|geo/i, "REGION_BLOCKED",
        "This video is blocked in your region."],
    [/private video/i, "PRIVATE", "This video is private."],
    [/video unavailable|has been removed|does not exist|account .* terminated/i, "UNAVAILABLE",
        "This video is unavailable."],
    [/requested format is not available/i, "FORMAT_UNAVAILABLE",
        "That audio format isn't offered for this video. Try another format."],
    [/HTTP Error 403|Forbidden/i, "FORBIDDEN",
        "YouTube refused the download. Update yt-dlp (`brew upgrade yt-dlp` or `pip install -U yt-dlp`)."],
];

const toAppError = (err) => {
    if (err.cancelled) return err;
    if (err.code === "ENOENT") return new AppError(500, "YTDLP_MISSING", `yt-dlp not found. ${INSTALL_HINT}`);
    const stderr = err.stderr || "";
    for (const [re, code, message] of ERROR_PATTERNS) {
        if (re.test(stderr)) return new AppError(502, code, message);
    }
    const lastError = stderr.split("\n").reverse().find((l) => l.startsWith("ERROR:"));
    return new AppError(502, "YTDLP_FAILED", lastError ? lastError.replace(/^ERROR:\s*/, "") : "yt-dlp failed.");
};

const commonArgs = (useCookies) => {
    const args = ["--no-playlist", "--no-warnings"];
    if (binaries.ffmpeg) args.push("--ffmpeg-location", path.dirname(binaries.ffmpeg));
    if (jsRuntime) args.push("--js-runtimes", `${jsRuntime[0]}:${jsRuntime[1]}`);
    if (useCookies && env.YTDLP_COOKIES_BROWSER !== "none") {
        args.push("--cookies-from-browser", env.YTDLP_COOKIES_BROWSER);
    }
    return args;
};

// Cookies make Premium streams and age-gated videos work, but reading them can
// fail (browser not installed, keychain locked). Retry once without them.
const withCookieFallback = async (fn) => {
    try {
        return await fn(true);
    } catch (err) {
        const mapped = toAppError(err);
        if (mapped.code === "COOKIES" && env.YTDLP_COOKIES_BROWSER !== "none") return fn(false);
        throw mapped;
    }
};

const ensureYtdlp = () => {
    if (!binaries.ytdlp) throw new AppError(500, "YTDLP_MISSING", `yt-dlp not found. ${INSTALL_HINT}`);
};

const audioFormats = (info) => (info.formats || [])
    .filter((f) => f.vcodec === "none" && f.acodec && f.acodec !== "none")
    .map((f) => ({
        id: f.format_id,
        codec: f.acodec.startsWith("mp4a") ? "aac" : f.acodec,
        abr: f.abr ? Math.round(f.abr) : null,
        sampleRate: f.asr || null,
        ext: f.ext,
        size: f.filesize || f.filesize_approx || null,
        drc: /drc/i.test(f.format_id) || /drc/i.test(f.format_note || ""),
    }))
    .sort((a, b) => (b.abr || 0) - (a.abr || 0));

/**
 * What can be downloaded for this video, and how good the best stream is.
 */
const probe = async (videoId) => {
    ensureYtdlp();
    const cached = probeCache.get(videoId);
    if (cached) return cached;

    const { stdout } = await withCookieFallback((cookies) =>
        run(binaries.ytdlp, [...commonArgs(cookies), "-J", videoUrl(videoId)]));
    const info = JSON.parse(stdout);
    const formats = audioFormats(info);
    const best = formats.find((f) => !f.drc) || formats[0] || null;
    const { artist, title } = parseArtistTitle(info);

    const result = {
        videoId,
        title: info.title,
        channel: info.channel || info.uploader,
        artist,
        trackTitle: title,
        duration: info.duration || null,
        thumbnail: info.thumbnail,
        uploadDate: info.upload_date || null,
        formats,
        best,
        grade: gradeSource(best?.abr),
        hasAac: formats.some((f) => f.codec === "aac" && !f.drc),
    };
    probeCache.set(videoId, result);
    return result;
};

/**
 * Download the raw source audio stream (no conversion) plus info json and cover.
 * @returns {Promise<{sourcePath: string, coverPath: string|null, info: object}>}
 */
const downloadSource = async ({ videoId, format, dir, onProgress, signal }) => {
    ensureYtdlp();
    await withCookieFallback((cookies) => run(binaries.ytdlp, [
        ...commonArgs(cookies),
        "-f", format,
        "-o", path.join(dir, "source.%(ext)s"),
        "--write-info-json",
        "--write-thumbnail", "--convert-thumbnails", "jpg",
        "--newline",
        "--progress-template", "download:DLPROG %(progress.downloaded_bytes)s %(progress.total_bytes)s %(progress.total_bytes_estimate)s",
        videoUrl(videoId),
    ], {
        signal,
        onStdoutLine: (line) => {
            const m = line.match(/^DLPROG (\d+) (\S+) (\S+)/);
            if (!m) return;
            const total = Number(m[2]) || Number(m[3]);
            if (total) onProgress?.(Math.min(1, Number(m[1]) / total));
        },
    }));

    const files = await fs.readdir(dir);
    const infoFile = files.find((f) => f.endsWith(".info.json"));
    const info = infoFile ? JSON.parse(await fs.readFile(path.join(dir, infoFile), "utf8")) : {};
    const cover = files.find((f) => f.endsWith(".jpg"));
    const source = files.find((f) => f.startsWith("source.") && !f.endsWith(".json") && !f.endsWith(".jpg") && !f.endsWith(".part"));
    if (!source) throw new AppError(502, "YTDLP_FAILED", "yt-dlp finished but no audio file was produced.");

    return {
        sourcePath: path.join(dir, source),
        coverPath: cover ? path.join(dir, cover) : null,
        info,
    };
};

module.exports = { probe, downloadSource, toAppError, audioFormats };
