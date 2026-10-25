const path = require("path");
const os = require("os");
const fs = require("fs");
const { execFileSync } = require("child_process");

// Common install locations so yt-dlp/ffmpeg resolve even when the server is
// launched from an IDE/GUI whose PATH is missing Homebrew / Python bin dirs.
const EXTRA_BIN_DIRS = [
    "/opt/homebrew/bin",
    "/usr/local/bin",
    path.join(os.homedir(), ".local/bin"),
    path.join(os.homedir(), ".deno/bin"),
    path.join(os.homedir(), ".bun/bin"),
    ...(() => {
        // Any python.org framework install (3.x) ships yt-dlp's pip entry point here.
        const root = "/Library/Frameworks/Python.framework/Versions";
        try {
            return fs.readdirSync(root).map((v) => path.join(root, v, "bin"));
        } catch {
            return [];
        }
    })(),
];

const SPAWN_PATH = [...EXTRA_BIN_DIRS, process.env.PATH || ""].join(path.delimiter);
const SPAWN_ENV = { ...process.env, PATH: SPAWN_PATH };

const exe = (name) => (process.platform === "win32" ? `${name}.exe` : name);

// Env override (e.g. a Tauri sidecar path) wins, then the first match on PATH.
const resolveBinary = (name, envVar) => {
    const override = process.env[envVar];
    if (override && fs.existsSync(override)) return override;
    for (const dir of SPAWN_PATH.split(path.delimiter)) {
        if (!dir) continue;
        const candidate = path.join(dir, exe(name));
        if (fs.existsSync(candidate)) return candidate;
    }
    return null;
};

const binaries = {
    ytdlp: resolveBinary("yt-dlp", "YTDLP_PATH"),
    ffmpeg: resolveBinary("ffmpeg", "FFMPEG_PATH"),
    ffprobe: resolveBinary("ffprobe", "FFPROBE_PATH"),
};

// yt-dlp needs a JavaScript runtime to solve YouTube's signature / "n" challenges.
// Without one, extraction silently degrades to lower-quality formats.
const jsRuntime = ["deno", "node", "bun"]
    .map((name) => [name, resolveBinary(name, `${name.toUpperCase()}_PATH`)])
    .find(([, p]) => p) || null;

const version = (bin, args) => {
    if (!bin) return null;
    try {
        return execFileSync(bin, args, { env: SPAWN_ENV, timeout: 5000 })
            .toString().split("\n")[0].trim();
    } catch {
        return null;
    }
};

// Used for the startup check and the /health diagnostics card.
const describeBinaries = () => ({
    ytdlp: { path: binaries.ytdlp, version: version(binaries.ytdlp, ["--version"]) },
    ffmpeg: { path: binaries.ffmpeg, version: version(binaries.ffmpeg, ["-version"]) },
    ffprobe: { path: binaries.ffprobe, version: version(binaries.ffprobe, ["-version"]) },
    jsRuntime: jsRuntime ? { name: jsRuntime[0], path: jsRuntime[1] } : null,
});

const INSTALL_HINT = "Install with `brew install yt-dlp ffmpeg` (macOS) or see the README.";

module.exports = { binaries, jsRuntime, SPAWN_ENV, describeBinaries, INSTALL_HINT };
