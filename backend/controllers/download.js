const { execFile } = require("child_process");
const path = require("path");
const { z } = require("zod");
const AppError = require("../utils/AppError");
const { PROFILES } = require("../services/audio/profiles");
const { probe } = require("../services/audio/ytdlp");
const jobs = require("../services/audio/jobs");

const videoId = z.string({ error: "Valid video ID is required" }).regex(/^[a-zA-Z0-9_-]{11}$/, "Valid video ID is required");
const profile = z.enum(Object.keys(PROFILES), { error: `Format must be one of: ${Object.keys(PROFILES).join(", ")}` });

const trackInfoSchema = z.object({ videoId });
const createSchema = z.object({ videoId, profile: profile.default("aiff") });
// Older clients call /downloadSong?format=...; title is ignored now (metadata comes from YouTube)
const legacySchema = z.object({ videoId, format: profile.default("mp3") });

const listProfiles = (req, res) => {
    res.json({
        profiles: Object.entries(PROFILES).map(([id, p]) => ({
            id, label: p.label, ext: p.ext, lossless: p.lossless, hint: p.hint,
        })),
    });
};

const trackInfo = async (req, res, next) => {
    try {
        res.json(await probe(req.valid.videoId));
    } catch (err) {
        next(err);
    }
};

const createDownload = (req, res) => {
    const job = jobs.createJob(req.valid);
    res.status(202).json(jobs.publicView(job));
};

// BPM/key/loudness without keeping a file. Cached results return immediately.
const analyzeTrack = (req, res) => {
    const cached = jobs.getCachedAnalysis(req.valid.videoId);
    if (cached) return res.json({ videoId: req.valid.videoId, status: "done", analysis: cached });
    const job = jobs.createJob({ videoId: req.valid.videoId, analyzeOnly: true });
    res.status(202).json(jobs.publicView(job));
};

const listDownloads = (req, res) => res.json({ downloads: jobs.listJobs() });

const getDownload = (req, res) => res.json(jobs.publicView(jobs.getJob(req.params.id)));

// Server-Sent Events: the current state immediately, then every change until the job ends.
const downloadEvents = (req, res) => {
    const job = jobs.getJob(req.params.id);
    res.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
    });
    const send = (state) => res.write(`event: update\ndata: ${JSON.stringify(state)}\n\n`);
    send(jobs.publicView(job));
    if (jobs.isFinished(job)) return res.end();

    const onUpdate = (state) => send(state);
    const onEnd = () => {
        send(jobs.publicView(job));
        res.end();
    };
    // Keeps proxies and the browser from timing out an idle stream
    const ping = setInterval(() => res.write(": ping\n\n"), 15000);
    job.events.on("update", onUpdate);
    job.events.once("end", onEnd);
    res.on("close", () => {
        clearInterval(ping);
        job.events.off("update", onUpdate);
        job.events.off("end", onEnd);
    });
};

const downloadFile = (req, res, next) => {
    const job = jobs.getJob(req.params.id);
    if (job.status !== "done") return next(new AppError(409, "NOT_READY", "This download hasn't finished yet."));
    res.download(job.finalPath, path.basename(job.finalPath), (err) => {
        if (err && !res.headersSent) next(new AppError(410, "FILE_GONE", "The file was moved or deleted."));
    });
};

const cancelDownload = (req, res) => res.json(jobs.publicView(jobs.cancelJob(req.params.id)));

// Show the finished file in Finder / Explorer. Only meaningful when the backend
// runs on the DJ's own machine (the normal and Tauri setup).
const revealDownload = (req, res, next) => {
    const job = jobs.getJob(req.params.id);
    if (job.status !== "done") return next(new AppError(409, "NOT_READY", "This download hasn't finished yet."));
    const file = job.finalPath;
    const [cmd, args] = process.platform === "darwin" ? ["open", ["-R", file]]
        : process.platform === "win32" ? ["explorer.exe", [`/select,${file}`]]
            : ["xdg-open", [path.dirname(file)]];
    execFile(cmd, args, () => {});
    res.json({ ok: true });
};

// Back-compat: run a job and stream the finished file in the same request.
const legacyDownload = (req, res, next) => {
    const job = jobs.createJob({ videoId: req.valid.videoId, profile: req.valid.format });
    res.on("close", () => {
        if (!res.writableFinished && !jobs.isFinished(job)) jobs.cancelJob(job.id);
    });
    job.events.once("end", () => {
        if (res.destroyed) return;
        if (job.status !== "done") {
            return next(new AppError(502, job.error?.code || "DOWNLOAD_FAILED", job.error?.message || "Download failed"));
        }
        res.download(job.finalPath, path.basename(job.finalPath));
    });
};

module.exports = {
    listProfiles, trackInfo, analyzeTrack, createDownload, listDownloads, getDownload, downloadEvents,
    downloadFile, cancelDownload, revealDownload, legacyDownload,
    trackInfoSchema, createSchema, legacySchema,
};
