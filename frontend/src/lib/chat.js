const LIST_ITEM = /^\s*(?:\d+[.)]|[-*•])\s+(.+)$/;
const HAS_SEPARATOR = /\S\s[-–—]\s\S/;
// Trailing notes the assistant adds after a track: " — 124 BPM, 8A", " | label", "(124 BPM)".
// Parentheses are only stripped when they hold BPM/key info - "(Extended Mix)" or
// "(pull me out of this)" are part of the title.
const TRAILING_NOTE = /\s+(?:[—|]\s.*|\((?=[^)]*(?:\bBPM\b|\b\d{1,2}[AB]\b))[^)]*\))\s*$/i;

/** Track suggestions in an assistant reply, as "Artist - Title" strings ready to search. */
export const parseTracks = (text) => text.split('\n')
  .map((line) => {
    const item = line.match(LIST_ITEM)?.[1];
    if (!item) return null;
    let name = item.replace(/\*\*/g, '').replace(/["“”]/g, '').trim();
    // Strip the first " — note" only after the artist separator, so "Artist — Title" survives
    const sep = name.search(/\s[-–]\s/);
    if (sep < 0) return null;
    const head = name.slice(0, sep + 3);
    const tail = name.slice(sep + 3).replace(TRAILING_NOTE, '');
    name = `${head}${tail}`.trim();
    return HAS_SEPARATOR.test(name) ? name : null;
  })
  .filter(Boolean)
  .slice(0, 15);
