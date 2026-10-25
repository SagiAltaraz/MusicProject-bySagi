// Output profiles. Everything is delivered at 44.1kHz - every CDJ/XDJ, Denon and
// controller supports it. Lossless profiles stop any further loss (no second
// lossy encode) but cannot add detail the YouTube source never had.

const SOXR = "resampler=soxr:precision=28";

const PROFILES = {
    mp3: {
        label: "MP3 320 CBR",
        ext: "mp3",
        lossless: false,
        cover: true,
        // CBR (not VBR V0) for exact seeking and stable beatgrids on older players
        codecArgs: ["-c:a", "libmp3lame", "-b:a", "320k", "-id3v2_version", "3", "-write_xing", "1"],
        filter: `aresample=44100:${SOXR}`,
        tagStyle: "id3",
        hint: "Plays on every CDJ and in all DJ software. Smallest files.",
    },
    aiff: {
        label: "AIFF 16-bit",
        ext: "aiff",
        lossless: true,
        cover: true,
        codecArgs: ["-c:a", "pcm_s16be", "-write_id3v2", "1", "-id3v2_version", "3"],
        filter: `aresample=44100:${SOXR}:osf=s16:dither_method=triangular`,
        tagStyle: "id3",
        hint: "Lossless with tags and artwork. Best choice for Rekordbox, Serato and CDJs.",
    },
    wav: {
        label: "WAV 16-bit",
        ext: "wav",
        lossless: true,
        cover: false,
        codecArgs: ["-c:a", "pcm_s16le"],
        filter: `aresample=44100:${SOXR}:osf=s16:dither_method=triangular`,
        tagStyle: "riff",
        hint: "Lossless and universal, but WAV tags are limited (no artwork).",
    },
    flac: {
        label: "FLAC 16-bit",
        ext: "flac",
        lossless: true,
        cover: true,
        codecArgs: ["-c:a", "flac", "-compression_level", "8"],
        filter: `aresample=44100:${SOXR}:osf=s16:dither_method=triangular`,
        tagStyle: "vorbis",
        hint: "Lossless and half the size of AIFF. CDJ-3000/XDJ and Serato yes; older CDJs no.",
    },
    m4a: {
        label: "AAC original",
        ext: "m4a",
        lossless: false,
        cover: true,
        // The YouTube AAC stream copied bit-for-bit: zero added loss
        codecArgs: ["-c:a", "copy"],
        filter: null,
        tagStyle: "mp4",
        sourceFormat: "bestaudio[acodec^=mp4a][format_id!*=drc]",
        hint: "YouTube's AAC stream untouched (no re-encode). Newer CDJs and all DJ software.",
    },
};

// Highest bitrate first; never YouTube's "DRC" (dynamic range compressed) variants,
// which squash the dynamics a club system needs.
const DEFAULT_SOURCE_FORMAT = "bestaudio[format_id!*=drc]/bestaudio";

const isProfile = (name) => Object.prototype.hasOwnProperty.call(PROFILES, name);

// Grade the source stream so the UI can say how good the download can possibly be.
const gradeSource = (abr) => {
    if (!abr) return "unknown";
    if (abr >= 200) return "high"; // 256k streams (YouTube Premium)
    if (abr >= 120) return "standard"; // regular ~128-160k streams
    return "low";
};

/**
 * Tag metadata for ffmpeg in the container's own conventions.
 * @param {object} t {title, artist, album, year, bpm, key, camelot, replayGain, peak, comment}
 */
const buildTags = (profile, t) => {
    const tags = { title: t.title, artist: t.artist, album: t.album, date: t.year, comment: t.comment };
    const style = PROFILES[profile].tagStyle;
    if (style === "id3") {
        Object.assign(tags, {
            TBPM: t.bpm ? String(Math.round(t.bpm)) : undefined,
            TKEY: t.key,
            REPLAYGAIN_TRACK_GAIN: t.replayGain,
            REPLAYGAIN_TRACK_PEAK: t.peak,
        });
    } else if (style === "vorbis") {
        Object.assign(tags, {
            BPM: t.bpm ? String(t.bpm) : undefined,
            INITIALKEY: t.key,
            REPLAYGAIN_TRACK_GAIN: t.replayGain,
            REPLAYGAIN_TRACK_PEAK: t.peak,
        });
    }
    return Object.entries(tags).filter(([, v]) => v !== undefined && v !== null && v !== "");
};

module.exports = { PROFILES, DEFAULT_SOURCE_FORMAT, isProfile, gradeSource, buildTags };
