const test = require("node:test");
const assert = require("node:assert/strict");
const { sanitizeFilename, parseArtistTitle } = require("../services/audio/filename");
const { buildTags, gradeSource, PROFILES } = require("../services/audio/profiles");
const { audioFormats } = require("../services/audio/ytdlp");

test("sanitizeFilename keeps Unicode and strips only illegal characters", () => {
    assert.equal(sanitizeFilename("עומר אדם - תגידו לה"), "עומר אדם - תגידו לה");
    assert.equal(sanitizeFilename("Beyoncé - CUFF IT (Wet Remix)"), "Beyoncé - CUFF IT (Wet Remix)");
    assert.equal(sanitizeFilename('AC/DC: "Back" <In> Black?|*'), "AC DC Back In Black");
    assert.equal(sanitizeFilename("  ..hidden.  "), "hidden");
    assert.equal(sanitizeFilename("CON", "fallback"), "fallback");
    assert.equal(sanitizeFilename("", "abc123"), "abc123");
    assert.ok(sanitizeFilename("x".repeat(400)).length <= 150);
    // Decomposed é (e + combining accent) becomes the single NFC code point
    assert.equal(sanitizeFilename("Café"), "Café");
});

test("parseArtistTitle splits titles and drops video noise", () => {
    assert.deepEqual(
        parseArtistTitle({ title: "Peggy Gou - Starry Night (Official Music Video)", channel: "Peggy Gou" }),
        { artist: "Peggy Gou", title: "Starry Night" },
    );
    assert.deepEqual(
        parseArtistTitle({ title: "Fred again.. – Delilah (pull me out of this) [Official Audio]" }),
        { artist: "Fred again..", title: "Delilah (pull me out of this)" },
    );
    // Mix names are part of the track and must stay
    assert.deepEqual(
        parseArtistTitle({ title: "Artbat - Horizon (Extended Mix) | Upperground" }),
        { artist: "Artbat", title: "Horizon (Extended Mix)" },
    );
    assert.deepEqual(
        parseArtistTitle({ title: "Starry Night", channel: "Peggy Gou - Topic" }),
        { artist: "Peggy Gou", title: "Starry Night" },
    );
    assert.deepEqual(
        parseArtistTitle({ title: "x", artist: "Bicep, Clara La San", track: "Water" }),
        { artist: "Bicep", title: "Water" },
    );
});

test("buildTags uses each container's tag names", () => {
    const t = { title: "T", artist: "A", bpm: 123.4, key: "Am", replayGain: "-8.80 dB", peak: "1.0" };
    const id3 = Object.fromEntries(buildTags("mp3", t));
    assert.equal(id3.TBPM, "123");
    assert.equal(id3.TKEY, "Am");
    const vorbis = Object.fromEntries(buildTags("flac", t));
    assert.equal(vorbis.BPM, "123.4");
    assert.equal(vorbis.INITIALKEY, "Am");
    // Undefined values are dropped instead of written as "undefined"
    assert.ok(!buildTags("wav", { title: "T" }).some(([, v]) => v === undefined));
});

test("profiles never apply gain or dynamics processing", () => {
    for (const [name, p] of Object.entries(PROFILES)) {
        const all = [...p.codecArgs, p.filter || ""].join(" ");
        assert.doesNotMatch(all, /loudnorm|dynaudnorm|acompressor|alimiter|volume=/, name);
    }
    assert.ok(PROFILES.mp3.codecArgs.includes("320k"));
    assert.ok(!PROFILES.mp3.codecArgs.includes("-q:a"), "mp3 must be CBR");
});

test("gradeSource and audioFormats", () => {
    assert.equal(gradeSource(256), "high");
    assert.equal(gradeSource(129), "standard");
    assert.equal(gradeSource(48), "low");
    assert.equal(gradeSource(null), "unknown");
    const formats = audioFormats({
        formats: [
            { format_id: "251-drc", vcodec: "none", acodec: "opus", abr: 130 },
            { format_id: "140", vcodec: "none", acodec: "mp4a.40.2", abr: 129.5 },
            { format_id: "18", vcodec: "avc1", acodec: "mp4a.40.2", abr: 96 },
        ],
    });
    assert.equal(formats.length, 2);
    assert.equal(formats[0].drc, true);
    assert.equal(formats[1].codec, "aac");
});
