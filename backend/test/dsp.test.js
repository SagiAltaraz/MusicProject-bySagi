const test = require("node:test");
const assert = require("node:assert/strict");
const { estimateBpm, estimateKey, estimateCutoffKHz, toCamelot, fft } = require("../services/audio/dsp");

const RATE = 22050;

// Kick-like decaying 60Hz bursts on every beat, plus an off-beat hi-hat
const clickTrack = (bpm, seconds = 40, rate = RATE) => {
    const out = new Float32Array(seconds * rate);
    const beat = (60 / bpm) * rate;
    for (let b = 0; b * beat < out.length; b++) {
        const start = Math.round(b * beat);
        for (let i = 0; i < 0.15 * rate && start + i < out.length; i++) {
            out[start + i] += Math.sin((2 * Math.PI * 60 * i) / rate) * Math.exp(-i / (0.03 * rate));
        }
        const hat = Math.round(start + beat / 2);
        for (let i = 0; i < 0.02 * rate && hat + i < out.length; i++) {
            out[hat + i] += 0.2 * (Math.random() * 2 - 1) * Math.exp(-i / (0.004 * rate));
        }
    }
    return out;
};

const freq = (midi) => 440 * 2 ** ((midi - 69) / 12);
const chordTone = (midis, seconds = 20, rate = RATE) => {
    const out = new Float32Array(seconds * rate);
    for (let i = 0; i < out.length; i++) {
        for (const m of midis) out[i] += 0.2 * Math.sin((2 * Math.PI * freq(m) * i) / rate);
    }
    return out;
};

for (const bpm of [90, 124, 128, 140, 174]) {
    test(`estimateBpm finds ${bpm} BPM`, () => {
        const got = estimateBpm(clickTrack(bpm), RATE);
        assert.ok(Math.abs(got - bpm) <= 0.5, `expected ~${bpm}, got ${got}`);
    });
}

test("estimateBpm returns null for very short audio", () => {
    assert.equal(estimateBpm(new Float32Array(RATE), RATE), null);
});

test("estimateKey recognises A minor and C major material", () => {
    // A minor: A C E melody/harmony across octaves, emphasised tonic
    const aMinor = chordTone([57, 60, 64, 69, 45, 57]);
    assert.equal(estimateKey(aMinor, RATE).camelot, "8A");
    // C major scale tones weighted to the triad
    const cMajor = chordTone([48, 60, 64, 67, 72, 62, 65, 69, 71].slice(0, 5));
    assert.equal(estimateKey(cMajor, RATE).key, "C");
});

test("toCamelot maps the circle of fifths", () => {
    assert.equal(toCamelot(0, false), "8B"); // C
    assert.equal(toCamelot(7, false), "9B"); // G
    assert.equal(toCamelot(5, false), "7B"); // F
    assert.equal(toCamelot(9, true), "8A"); // Am
    assert.equal(toCamelot(4, true), "9A"); // Em
    assert.equal(toCamelot(8, true), "1A"); // Abm
});

test("estimateCutoffKHz detects a 16kHz low-pass", () => {
    const rate = 44100;
    const n = rate * 5;
    const noise = Float32Array.from({ length: n }, () => Math.random() * 2 - 1);
    // Brick-wall low-pass in the frequency domain, block by block
    const size = 4096;
    const out = new Float32Array(n);
    for (let s = 0; s + size <= n; s += size) {
        const re = Float64Array.from(noise.subarray(s, s + size));
        const im = new Float64Array(size);
        fft(re, im);
        const cut = Math.round((16000 / rate) * size);
        for (let k = cut; k <= size - cut; k++) re[k] = im[k] = 0;
        // Inverse FFT via conjugation
        for (let k = 0; k < size; k++) im[k] = -im[k];
        fft(re, im);
        for (let k = 0; k < size; k++) out[s + k] = re[k] / size;
    }
    const got = estimateCutoffKHz(out, rate);
    assert.ok(got >= 15.5 && got <= 16.5, `expected ~16kHz, got ${got}`);
});
