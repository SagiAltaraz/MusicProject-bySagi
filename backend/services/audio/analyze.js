const logger = require("../../utils/logger");
const { decodePcm, measureLoudness } = require("./ffmpeg");
const { estimateBpm, estimateKey, estimateCutoffKHz } = require("./dsp");

const REPLAYGAIN_REFERENCE_LUFS = -18;

// Optional steps must never fail a download - log and move on.
const safely = async (label, fn) => {
    try {
        return await fn();
    } catch (err) {
        if (err.cancelled) throw err;
        logger.warn({ err: err.message }, `analysis step "${label}" failed`);
        return null;
    }
};

/**
 * Non-destructive analysis of the source audio. Nothing here changes the sound;
 * results are written as tags (ReplayGain, BPM, key) and shown in the UI.
 */
const analyze = async (file, duration, signal) => {
    // Analyse the middle of the track - intros/outros are often beatless
    const window = (seconds) => {
        if (!duration || duration <= seconds) return { start: 0, duration: seconds };
        return { start: Math.max(0, duration / 2 - seconds / 2), duration: seconds };
    };

    const loudness = await safely("loudness", () => measureLoudness(file, signal));

    const rhythm = await safely("bpm/key", async () => {
        const rate = 22050;
        const pcm = await decodePcm(file, { rate, ...window(120), signal });
        return { bpm: estimateBpm(pcm, rate), key: estimateKey(pcm, rate) };
    });

    const cutoffKHz = await safely("cutoff", async () => {
        const rate = 44100;
        const pcm = await decodePcm(file, { rate, ...window(30), signal });
        return estimateCutoffKHz(pcm, rate);
    });

    const lufs = loudness?.lufs ?? null;
    const truePeakDb = Number.isFinite(loudness?.truePeakDb) ? loudness.truePeakDb : null;
    return {
        lufs,
        lra: loudness?.lra ?? null,
        truePeakDb,
        // Inter-sample peaks above 0 dBTP will clip on a DAC/mixer at unity gain
        clipping: truePeakDb !== null && truePeakDb > 0,
        replayGainDb: lufs !== null ? Math.round((REPLAYGAIN_REFERENCE_LUFS - lufs) * 100) / 100 : null,
        bpm: rhythm?.bpm ?? null,
        key: rhythm?.key?.key ?? null,
        camelot: rhythm?.key?.camelot ?? null,
        keyConfidence: rhythm?.key?.confidence ?? null,
        cutoffKHz,
    };
};

module.exports = { analyze };
