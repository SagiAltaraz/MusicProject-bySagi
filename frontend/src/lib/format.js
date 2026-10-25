// Shared formatting helpers

export function decodeHtml(html = '') {
  const txt = document.createElement('textarea');
  txt.innerHTML = html;
  return txt.value;
}

export function formatTime(seconds) {
  if (!seconds || Number.isNaN(seconds)) return '0:00';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60).toString().padStart(2, '0');
  return h ? `${h}:${m.toString().padStart(2, '0')}:${s}` : `${m}:${s}`;
}

/** "1 track", "3 tracks" */
export const tracksLabel = (n) => `${n} ${n === 1 ? 'track' : 'tracks'}`;

export function formatBytes(bytes) {
  if (!bytes) return '';
  const units = ['B', 'KB', 'MB', 'GB'];
  let i = 0;
  let n = bytes;
  while (n >= 1024 && i < units.length - 1) {
    n /= 1024;
    i++;
  }
  return `${n.toFixed(i > 1 ? 1 : 0)} ${units[i]}`;
}

/** Track fields used everywhere, from a YouTube search item. */
export function trackFields(song) {
  const title = decodeHtml(song?.snippet?.title);
  const channel = decodeHtml(song?.snippet?.channelTitle);
  const thumbs = song?.snippet?.thumbnails || {};
  return {
    videoId: song?.id?.videoId,
    title,
    channel: channel.replace(/ - Topic$/i, ''),
    duration: song?.durationSeconds || 0,
    thumbnail: thumbs.high?.url || thumbs.medium?.url || thumbs.default?.url,
    thumbnailSmall: thumbs.default?.url || thumbs.medium?.url,
  };
}

// ---- Camelot wheel ----

/** Hue per Camelot number, matching the colours DJs know from Mixed In Key. */
export function camelotColor(camelot) {
  const n = parseInt(camelot, 10);
  if (!n) return null;
  return `hsl(${((n - 1) * 30 + 150) % 360} 75% 55%)`;
}

/** Keys that mix harmonically: same, ±1 on the wheel, and the relative major/minor. */
export function compatibleKeys(camelot) {
  const n = parseInt(camelot, 10);
  const letter = camelot?.slice(-1);
  if (!n || !['A', 'B'].includes(letter)) return [];
  const wrap = (x) => ((x - 1 + 12) % 12) + 1;
  return [`${n}${letter}`, `${wrap(n - 1)}${letter}`, `${wrap(n + 1)}${letter}`, `${n}${letter === 'A' ? 'B' : 'A'}`];
}

/** Tempo match within ±pct, also accepting half/double time. */
export function bpmCompatible(a, b, pct = 6) {
  if (!a || !b) return false;
  return [b, b * 2, b / 2].some((x) => Math.abs(a - x) / a <= pct / 100);
}

export const GRADE_INFO = {
  high: { label: 'High', tone: 'success', text: '256kbps source (YouTube Premium) - as good as YouTube gets' },
  standard: { label: 'Standard', tone: 'neon', text: '~128kbps source - fine for most club systems' },
  low: { label: 'Low', tone: 'danger', text: 'Low bitrate source - avoid for big rooms' },
  unknown: { label: '?', tone: 'muted', text: 'Source quality unknown' },
};
