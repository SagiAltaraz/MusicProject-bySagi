// Small, dependency-free DSP used for non-destructive track analysis:
// tempo (BPM), musical key (with Camelot notation) and spectral cutoff.
// Estimates are meant as a helpful first guess - DJ software re-analyses anyway.

// In-place iterative radix-2 FFT. re/im lengths must be a power of two.
const fft = (re, im) => {
    const n = re.length;
    for (let i = 1, j = 0; i < n; i++) {
        let bit = n >> 1;
        for (; j & bit; bit >>= 1) j ^= bit;
        j ^= bit;
        if (i < j) {
            [re[i], re[j]] = [re[j], re[i]];
            [im[i], im[j]] = [im[j], im[i]];
        }
    }
    for (let len = 2; len <= n; len <<= 1) {
        const ang = (-2 * Math.PI) / len;
        const wr = Math.cos(ang);
        const wi = Math.sin(ang);
        for (let i = 0; i < n; i += len) {
            let cr = 1;
            let ci = 0;
            for (let k = 0; k < len / 2; k++) {
                const a = i + k;
                const b = a + len / 2;
                const tr = re[b] * cr - im[b] * ci;
                const ti = re[b] * ci + im[b] * cr;
                re[b] = re[a] - tr;
                im[b] = im[a] - ti;
                re[a] += tr;
                im[a] += ti;
                const ncr = cr * wr - ci * wi;
                ci = cr * wi + ci * wr;
                cr = ncr;
            }
        }
    }
};

const hann = (n) => Float64Array.from({ length: n }, (_, i) => 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (n - 1)));

// Calls onFrame(magnitudes) for each windowed frame of the signal.
const stft = (samples, size, hop, onFrame) => {
    const win = hann(size);
    const re = new Float64Array(size);
    const im = new Float64Array(size);
    const mag = new Float64Array(size / 2);
    for (let start = 0; start + size <= samples.length; start += hop) {
        for (let i = 0; i < size; i++) {
            re[i] = samples[start + i] * win[i];
            im[i] = 0;
        }
        fft(re, im);
        for (let k = 0; k < size / 2; k++) mag[k] = Math.hypot(re[k], im[k]);
        onFrame(mag);
    }
};

/**
 * Tempo from the autocorrelation of a spectral-flux onset envelope, scored with a
 * comb over the first beats and a log-normal prior around 125 BPM (house/techno),
 * then folded into the 78-180 BPM range most DJ software uses.
 * @param {Float32Array} samples mono PCM
 * @param {number} rate sample rate
 * @returns {number|null} BPM rounded to 0.1
 */
const estimateBpm = (samples, rate) => {
    const size = 1024;
    const hop = 128;
    const fps = rate / hop;
    if (samples.length < rate * 10) return null;

    // Onset envelope: half-wave rectified log-magnitude flux
    const env = [];
    let prev = null;
    stft(samples, size, hop, (mag) => {
        const cur = Float64Array.from(mag, (m) => Math.log1p(100 * m));
        let flux = 0;
        if (prev) for (let k = 0; k < cur.length; k++) flux += Math.max(0, cur[k] - prev[k]);
        env.push(flux);
        prev = cur;
    });

    // Remove the slow trend (moving average over ~0.5s) so only onsets remain
    const w = Math.round(fps / 2);
    const e = new Float64Array(env.length);
    let sum = 0;
    for (let i = 0; i < env.length; i++) {
        sum += env[i];
        if (i >= w) sum -= env[i - w];
        e[i] = Math.max(0, env[i] - sum / Math.min(i + 1, w));
    }

    const maxLag = Math.ceil((fps * 60 / 50) * 8) + 2;
    const acf = new Float64Array(maxLag);
    for (let lag = 1; lag < maxLag; lag++) {
        let s = 0;
        for (let t = 0; t + lag < e.length; t++) s += e[t] * e[t + lag];
        acf[lag] = s / (e.length - lag);
    }
    const acfAt = (lag) => {
        const i = Math.floor(lag);
        if (i + 1 >= maxLag) return 0;
        return acf[i] + (acf[i + 1] - acf[i]) * (lag - i);
    };
    const score = (bpm, beats) => {
        const lag = (fps * 60) / bpm;
        let s = 0;
        for (let k = 1; k <= beats; k++) s += acfAt(k * lag);
        return s / beats;
    };

    let best = null;
    let bestScore = -Infinity;
    for (let bpm = 60; bpm <= 200; bpm += 0.05) {
        const prior = Math.exp(-0.5 * (Math.log2(bpm / 125) / 0.9) ** 2);
        const s = score(bpm, 4) * prior;
        if (s > bestScore) {
            bestScore = s;
            best = bpm;
        }
    }
    if (!best || bestScore <= 0) return null;

    while (best > 180) best /= 2;
    while (best < 78) best *= 2;

    // Refine with a longer comb (more beats = finer lag resolution)
    let refined = best;
    let refinedScore = -Infinity;
    for (let bpm = best - 1.5; bpm <= best + 1.5; bpm += 0.01) {
        const s = score(bpm, 8);
        if (s > refinedScore) {
            refinedScore = s;
            refined = bpm;
        }
    }
    return Math.round(refined * 10) / 10;
};

const PITCH_CLASSES = ["C", "C#", "D", "Eb", "E", "F", "F#", "G", "Ab", "A", "Bb", "B"];
// Krumhansl-Kessler key profiles
const MAJOR = [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88];
const MINOR = [6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17];

// Camelot: C major = 8B, each step round the circle of fifths adds one.
// A minor key shares its number with its relative major (3 semitones up).
const toCamelot = (pc, minor) => {
    const majorPc = minor ? (pc + 3) % 12 : pc;
    const number = (((majorPc * 7) % 12) + 7) % 12 + 1;
    return `${number}${minor ? "A" : "B"}`;
};

const pearson = (a, b) => {
    const n = a.length;
    const ma = a.reduce((s, x) => s + x, 0) / n;
    const mb = b.reduce((s, x) => s + x, 0) / n;
    let num = 0;
    let da = 0;
    let db = 0;
    for (let i = 0; i < n; i++) {
        num += (a[i] - ma) * (b[i] - mb);
        da += (a[i] - ma) ** 2;
        db += (b[i] - mb) ** 2;
    }
    return da && db ? num / Math.sqrt(da * db) : 0;
};

/**
 * Key from an averaged chromagram correlated against the 24 major/minor profiles.
 * @returns {{key: string, camelot: string, confidence: number}|null}
 *   key uses ID3 TKEY notation ("Am", "F#", "Bbm")
 */
const estimateKey = (samples, rate) => {
    const size = 8192;
    const chroma = new Float64Array(12);
    const binPc = new Int8Array(size / 2).fill(-1);
    for (let k = 1; k < size / 2; k++) {
        const f = (k * rate) / size;
        if (f < 65 || f > 2100) continue; // C2..C7, where harmony lives
        binPc[k] = ((Math.round(69 + 12 * Math.log2(f / 440)) % 12) + 12) % 12;
    }
    let frames = 0;
    stft(samples, size, size / 2, (mag) => {
        const frame = new Float64Array(12);
        let total = 0;
        for (let k = 0; k < mag.length; k++) {
            if (binPc[k] < 0) continue;
            frame[binPc[k]] += mag[k];
            total += mag[k];
        }
        if (total < 1e-6) return; // silence
        // Normalise per frame so loud sections don't dominate
        for (let i = 0; i < 12; i++) chroma[i] += frame[i] / total;
        frames++;
    });
    if (frames < 10) return null;

    const scores = [];
    for (let pc = 0; pc < 12; pc++) {
        const rotated = Array.from(chroma, (_, i) => chroma[(i + pc) % 12]);
        scores.push({ pc, minor: false, r: pearson(rotated, MAJOR) });
        scores.push({ pc, minor: true, r: pearson(rotated, MINOR) });
    }
    scores.sort((a, b) => b.r - a.r);
    const [top, second] = scores;
    return {
        key: `${PITCH_CLASSES[top.pc]}${top.minor ? "m" : ""}`,
        camelot: toCamelot(top.pc, top.minor),
        // Gap to the runner-up, 0..1 - low values mean an ambiguous key
        confidence: Math.max(0, Math.min(1, (top.r - second.r) * 5)),
    };
};

/**
 * Highest frequency that still carries real content - lossy encoders low-pass
 * their input (AAC 128k ≈ 16-17kHz, Opus ≈ 20kHz), so this shows source quality.
 * @returns {number|null} cutoff in kHz, rounded to 0.5
 */
const estimateCutoffKHz = (samples, rate) => {
    const size = 4096;
    const power = new Float64Array(size / 2);
    let frames = 0;
    stft(samples, size, size, (mag) => {
        for (let k = 0; k < mag.length; k++) power[k] += mag[k] * mag[k];
        frames++;
    });
    if (!frames) return null;
    const db = Array.from(power, (p) => 10 * Math.log10(p / frames + 1e-20));
    const binHz = rate / size;
    // Reference: median level of the 1-5kHz band
    const band = db.slice(Math.round(1000 / binHz), Math.round(5000 / binHz)).sort((a, b) => a - b);
    const ref = band[Math.floor(band.length / 2)];
    // Walk down from Nyquist until a smoothed bin is within 45dB of the reference
    const smooth = 8;
    for (let k = db.length - smooth; k > smooth; k--) {
        let avg = 0;
        for (let j = -smooth; j <= smooth; j++) avg += db[k + j];
        if (avg / (2 * smooth + 1) > ref - 45) return Math.round((k * binHz) / 500) / 2;
    }
    return null;
};

module.exports = { fft, estimateBpm, estimateKey, estimateCutoffKHz, toCamelot };
