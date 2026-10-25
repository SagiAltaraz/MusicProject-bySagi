const fs = require("fs/promises");
const fsSync = require("fs");
const os = require("os");
const path = require("path");
const crypto = require("crypto");
const { EventEmitter } = require("events");
const { LRUCache } = require("lru-cache");
const PQueue = require("p-queue").default;
const env = require("../../config/env");
const logger = require("../../utils/logger");
const AppError = require("../../utils/AppError");
const { PROFILES, DEFAULT_SOURCE_FORMAT, gradeSource } = require("./profiles");
const { sanitizeFilename, parseArtistTitle } = require("./filename");
const { downloadSource, toAppError } = require("./ytdlp");
const { probeFile, encode } = require("./ffmpeg");
const { analyze } = require("./analyze");

const queue = new PQueue({ concurrency: env.DOWNLOAD_CONCURRENCY });
// Finished jobs stay listable for a while so the UI can show history after a reload
const jobs = new LRUCache({ max: 200, ttl: 6 * 60 * 60 * 1000 });

// Weight of each stage in the overall progress bar
const STAGES = { queued: [0, 0], downloading: [0, 0.6], analysing: [0.6, 0.75], converting: [0.75, 0.98], done: [1, 1] };

// "Artist - Title.ext", or "Artist - Title (2).ext" if that name is taken
const uniquePath = (dir, base, ext) => {
    for (let n = 1; ; n++) {
        const candidate = path.join(dir, `${base}${n > 1 ? ` (${n})` : ""}.${ext}`);
        if (!fsSync.existsSync(candidate)) return candidate;
    }
};

const publicView = (job) => ({
    id: job.id,
    videoId: job.videoId,
    profile: job.profile,
    status: job.status,
    stage: job.stage,
    progress: Math.round(job.progress * 1000) / 1000,
    title: job.title,
    artist: job.artist,
    fileName: job.finalPath ? path.basename(job.finalPath) : null,
    filePath: job.finalPath,
    source: job.source,
    output: job.output,
    analysis: job.analysis,
    error: job.error,
    createdAt: job.createdAt,
    finishedAt: job.finishedAt,
});

const update = (job, patch) => {
    Object.assign(job, patch);
    if (patch.stage && STAGES[patch.stage] && patch.progress === undefined) job.progress = STAGES[patch.stage][0];
    job.events.emit("update", publicView(job));
};

const stageProgress = (job, stage) => (fraction) => {
    const [from, to] = STAGES[stage];
    const progress = from + (to - from) * fraction;
    // Throttle: only emit visible changes
    if (progress - job.progress >= 0.01 || fraction === 1) update(job, { progress });
};

const runJob = async (job) => {
    const work = await fs.mkdtemp(path.join(os.tmpdir(), "djcrate-"));
    const timeout = setTimeout(() => job.abort.abort(), env.DOWNLOAD_TIMEOUT_SECONDS * 1000);
    const { signal } = job.abort;
    const profile = PROFILES[job.profile];

    try {
        update(job, { status: "running", stage: "downloading" });
        const { sourcePath, coverPath, info } = await downloadSource({
            videoId: job.videoId,
            format: profile.sourceFormat || DEFAULT_SOURCE_FORMAT,
            dir: work,
            signal,
            onProgress: stageProgress(job, "downloading"),
        });

        const { artist, title } = parseArtistTitle(info);
        const sourceFacts = await probeFile(sourcePath, signal);
        const sourceAbr = info.abr ? Math.round(info.abr) : (sourceFacts.bitRate ? Math.round(sourceFacts.bitRate / 1000) : null);
        update(job, {
            artist,
            title,
            source: {
                formatId: info.format_id,
                codec: sourceFacts.codec,
                abr: sourceAbr,
                sampleRate: sourceFacts.sampleRate,
                grade: gradeSource(sourceAbr),
            },
            stage: "analysing",
        });

        const duration = sourceFacts.duration || info.duration;
        const analysis = await analyze(sourcePath, duration, signal);
        update(job, { analysis, stage: "converting" });

        const year = (info.release_year || info.upload_date?.slice(0, 4)) ?? undefined;
        const commentParts = [analysis.camelot, analysis.bpm && `${analysis.bpm} BPM`, `youtube.com/watch?v=${job.videoId}`];
        const tmpOut = path.join(work, `output.${profile.ext}`);
        await encode({
            input: sourcePath,
            cover: coverPath,
            output: tmpOut,
            profile: job.profile,
            duration,
            signal,
            onProgress: stageProgress(job, "converting"),
            tags: {
                title,
                artist,
                album: info.album,
                year: year && String(year),
                bpm: analysis.bpm,
                key: analysis.key,
                replayGain: analysis.replayGainDb !== null ? `${analysis.replayGainDb.toFixed(2)} dB` : undefined,
                peak: analysis.truePeakDb !== null ? (10 ** (analysis.truePeakDb / 20)).toFixed(6) : undefined,
                // Mixed In Key style: Camelot first so DJ software can sort by it
                comment: commentParts.filter(Boolean).join(" - "),
            },
        });

        const output = await probeFile(tmpOut, signal);
        await fs.mkdir(env.DOWNLOAD_DIR, { recursive: true });
        const base = sanitizeFilename(`${artist} - ${title}`, job.videoId);
        const finalPath = uniquePath(env.DOWNLOAD_DIR, base, profile.ext);
        // copy + unlink: rename fails across volumes (tmp → external drive)
        await fs.copyFile(tmpOut, finalPath);

        update(job, {
            status: "done",
            stage: "done",
            progress: 1,
            finalPath,
            finishedAt: Date.now(),
            output: {
                codec: output.codec,
                sampleRate: output.sampleRate,
                bitsPerSample: output.bitsPerSample,
                bitRate: output.bitRate,
                size: output.size,
                duration: output.duration,
                hasCover: output.hasCover,
                lossless: profile.lossless,
                // A lossless file made from a lossy stream: honest label for the UI
                upconverted: profile.lossless,
            },
        });
        logger.info({ id: job.id, file: finalPath }, "download finished");
    } catch (err) {
        const cancelled = err.cancelled || signal.aborted;
        const timedOut = cancelled && !job.cancelRequested;
        const mapped = err instanceof AppError ? err : toAppError(err);
        update(job, {
            status: cancelled && !timedOut ? "cancelled" : "error",
            finishedAt: Date.now(),
            error: timedOut
                ? { code: "TIMEOUT", message: "The download took too long and was stopped." }
                : cancelled ? null : { code: mapped.code || "INTERNAL", message: mapped.message },
        });
        if (!cancelled) logger.warn({ id: job.id, err: mapped.message }, "download failed");
    } finally {
        clearTimeout(timeout);
        fs.rm(work, { recursive: true, force: true }).catch(() => {});
        job.events.emit("end");
    }
};

const createJob = ({ videoId, profile }) => {
    const job = {
        id: crypto.randomUUID(),
        videoId,
        profile,
        status: "queued",
        stage: "queued",
        progress: 0,
        createdAt: Date.now(),
        abort: new AbortController(),
        events: new EventEmitter(),
    };
    job.events.setMaxListeners(50);
    jobs.set(job.id, job);
    queue.add(() => (job.abort.signal.aborted ? null : runJob(job)));
    return job;
};

const getJob = (id) => {
    const job = jobs.get(id);
    if (!job) throw new AppError(404, "JOB_NOT_FOUND", "Download not found (it may have expired).");
    return job;
};

const cancelJob = (id) => {
    const job = getJob(id);
    if (job.status === "queued" || job.status === "running") {
        job.cancelRequested = true;
        job.abort.abort();
        if (job.status === "queued") {
            update(job, { status: "cancelled", finishedAt: Date.now() });
            job.events.emit("end");
        }
    }
    return job;
};

const listJobs = () => [...jobs.values()].sort((a, b) => b.createdAt - a.createdAt).map(publicView);

const isFinished = (job) => ["done", "error", "cancelled"].includes(job.status);

module.exports = { createJob, getJob, cancelJob, listJobs, publicView, isFinished };
