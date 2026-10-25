// "1. Artist - Title — 124 BPM, 8A" → "Artist - Title"
const TRACK_LINE = /^\s*(?:\d+[.)]|[-*•])\s+\**(.+?\s[-–—]\s.+?)\**(?:\s+[—(|].*)?$/;

/** Track suggestions in an assistant reply, ready to search for. */
export const parseTracks = (text) => text.split('\n')
  .map((l) => l.match(TRACK_LINE)?.[1]?.replace(/\*\*/g, '').replace(/["“”]/g, '').trim())
  .filter(Boolean)
  .slice(0, 15);
