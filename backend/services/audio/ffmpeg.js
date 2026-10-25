const AppError = require("../../utils/AppError");
const { binaries, INSTALL_HINT } = require("../../utils/binaries");
const { run } = require("./process");
const { PROFILES, buildTags } = require("./profiles");

const ensure = (name) => {
    if (!binaries[name]) throw new AppError(500, `${name.toUpperCase()}_MISSING`, `${name} not found. ${INSTALL_HINT}`);
    return binaries[name];
};

/** Stream/format facts for a file via ffprobe. */
const probeFile = async (file, signal) => {
    const { stdout } = await run(ensure("ffprobe"), [
        "-v", "error", "-print_format", "json", "-show_format", "-show_streams", file,
    ], { signal });
    const data = JSON.parse(stdout);
    const audio = data.streams.find((s) => s.codec_type === "audio") || {};
    return {
        codec: audio.codec_name,
        sampleRate: Number(audio.sample_rate) || null,
        sampleFormat: audio.sample_fmt,
        bitsPerSample: Number(audio.bits_per_raw_sample || audio.bits_per_sample) || null,
        channels: audio.channels,
        bitRate: Number(audio.bit_rate || data.format.bit_rate) || null,
        duration: Number(data.format.duration) || null,
        size: Number(data.format.size) || null,
        tags: data.format.tags || {},
        hasCover: data.streams.some((s) => s.disposition?.attached_pic),
    };
};

/** Decode to mono 32-bit float PCM (for analysis only). */
const decodePcm = async (file, { rate, start = 0, duration, signal }) => {
    const args = ["-v", "error"];
    if (start > 0) args.push("-ss", String(start));
    if (duration) args.push("-t", String(duration));
    args.push("-i", file, "-ac", "1", "-ar", String(rate), "-f", "f32le", "pipe:1");
    const { stdout } = await run(ensure("ffmpeg"), args, { signal, binaryStdout: true });
    return new Float32Array(stdout.buffer, stdout.byteOffset, Math.floor(stdout.byteLength / 4));
};

/** EBU R128 integrated loudness, loudness range and true peak - measured, never applied. */
const measureLoudness = async (file, signal) => {
    const { stderr } = await run(ensure("ffmpeg"), [
        "-hide_banner", "-nostats", "-i", file,
        "-af", "ebur128=peak=true:framelog=quiet", "-f", "null", "-",
    ], { signal });
    // The summary block is printed last
    const summary = stderr.slice(stderr.lastIndexOf("Summary:"));
    const num = (re) => {
        const m = summary.match(re);
        return m ? Number(m[1]) : null;
    };
    return {
        lufs: num(/I:\s+(-?[\d.]+) LUFS/),
        lra: num(/LRA:\s+(-?[\d.]+) LU/),
        truePeakDb: num(/Peak:\s+(-?[\d.]+|-inf) dBFS/),
    };
};

/**
 * One encode from the source stream to the target profile, with tags and cover.
 * No gain, compression, limiting or normalisation - only resampling/dither when needed.
 */
const encode = async ({ input, cover, output, profile, tags, duration, onProgress, signal }) => {
    const p = PROFILES[profile];
    const useCover = p.cover && cover;
    const args = ["-hide_banner", "-v", "error", "-y", "-i", input];
    if (useCover) args.push("-i", cover);
    args.push("-map", "0:a:0");
    if (useCover) {
        args.push("-map", "1:0", "-c:v", "mjpeg", "-disposition:v:0", "attached_pic",
            "-metadata:s:v", "title=Album cover", "-metadata:s:v", "comment=Cover (front)");
    }
    // Drop YouTube's own tags, then write ours
    args.push("-map_metadata", "-1", ...p.codecArgs);
    if (p.filter) args.push("-af", p.filter);
    for (const [key, value] of buildTags(profile, tags)) args.push("-metadata", `${key}=${value}`);
    args.push("-progress", "pipe:1", "-nostats", output);

    await run(ensure("ffmpeg"), args, {
        signal,
        onStdoutLine: (line) => {
            const m = line.match(/^out_time_us=(\d+)/);
            if (m && duration) onProgress?.(Math.min(1, Number(m[1]) / 1e6 / duration));
        },
    });
};

module.exports = { probeFile, decodePcm, measureLoudness, encode };
