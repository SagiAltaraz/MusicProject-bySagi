// Filenames and artist/title parsing. Unicode (Hebrew, Arabic, accented Latin...)
// is preserved - only characters illegal on macOS/Windows/Linux are removed.

// Control characters are illegal in filenames on Windows and break shells elsewhere
// eslint-disable-next-line no-control-regex
const ILLEGAL = /[/\\:*?"<>|\u0000-\u001f\u007f]/g;
const WINDOWS_RESERVED = /^(con|prn|aux|nul|com\d|lpt\d)$/i;
const MAX_LENGTH = 150;

const sanitizeFilename = (name, fallback = "track") => {
    let clean = String(name ?? "")
        .normalize("NFC")
        .replace(ILLEGAL, " ")
        .replace(/\s+/g, " ")
        .trim()
        // Windows strips trailing dots/spaces; a leading dot would hide the file
        .replace(/^[.\s]+|[.\s]+$/g, "");
    if (clean.length > MAX_LENGTH) clean = clean.slice(0, MAX_LENGTH).trim();
    if (!clean || WINDOWS_RESERVED.test(clean)) return fallback;
    return clean;
};

// Video-title noise that isn't part of the track name. Mix names such as
// "(Extended Mix)" or "(Fred again.. Remix)" are deliberately kept.
const NOISE = [
    /\s*[([]\s*(official\s*)?(music\s*)?(video|audio|visuali[sz]er|lyric(s)?(\s*video)?|clip)\s*[)\]]/gi,
    /\s*[([]\s*(hd|hq|4k|8k|1080p|720p|explicit|clean)\s*[)\]]/gi,
    /\s*[([]\s*(out now|free download|premiere)[^)\]]*[)\]]/gi,
    /\s*\|.*$/, // "Title | Label Showcase"
];

const cleanChannel = (channel = "") => channel
    .replace(/\s*-\s*Topic$/i, "")
    .replace(/VEVO$/i, "")
    .replace(/\s*(official)$/i, "")
    .trim();

/**
 * Best-effort artist/title from yt-dlp metadata.
 * YouTube Music uploads carry real artist/track fields; others use "Artist - Title".
 */
const parseArtistTitle = ({ title = "", channel = "", artist, track } = {}) => {
    if (artist && track) return { artist: artist.split(",")[0].trim(), title: track.trim() };

    let t = title;
    for (const re of NOISE) t = t.replace(re, "");
    t = t.replace(/\s+/g, " ").trim();

    // Accept " - ", " – " and " — " as the artist separator
    const m = t.match(/^(.+?)\s+[-–—]\s+(.+)$/);
    if (m) return { artist: m[1].trim(), title: m[2].trim() };
    return { artist: cleanChannel(channel) || "Unknown Artist", title: t || title };
};

module.exports = { sanitizeFilename, parseArtistTitle, cleanChannel };
