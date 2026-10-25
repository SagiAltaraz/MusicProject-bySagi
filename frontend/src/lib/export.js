import { trackFields } from './format';

const xml = (s = '') => String(s).replace(/[<>&"']/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' })[c]);
const csvCell = (v) => {
  const s = v === undefined || v === null ? '' : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
// Rekordbox wants file://localhost/ + a percent-encoded absolute path
const fileUri = (p) => `file://localhost${p.split('/').map(encodeURIComponent).join('/')}`;

function rows(crate, meta, files) {
  return crate.tracks.map((song) => {
    const t = trackFields(song);
    const a = meta[t.videoId]?.analysis || {};
    return { ...t, analysis: a, file: files[t.videoId] };
  });
}

/** Extended M3U. Downloaded tracks point at the file, others at YouTube. */
export function toM3U(crate, meta, files) {
  const lines = ['#EXTM3U', `#PLAYLIST:${crate.name}`];
  for (const r of rows(crate, meta, files)) {
    lines.push(`#EXTINF:${Math.round(r.duration) || -1},${r.title}`);
    lines.push(r.file?.path || `https://www.youtube.com/watch?v=${r.videoId}`);
  }
  return lines.join('\n') + '\n';
}

export function toCSV(crate, meta, files) {
  const header = ['Title', 'Channel', 'Duration (s)', 'BPM', 'Key', 'Camelot', 'LUFS', 'YouTube', 'File'];
  const body = rows(crate, meta, files).map((r) => [
    r.title, r.channel, r.duration || '', r.analysis.bpm ?? '', r.analysis.key ?? '', r.analysis.camelot ?? '',
    r.analysis.lufs ?? '', `https://www.youtube.com/watch?v=${r.videoId}`, r.file?.path ?? '',
  ].map(csvCell).join(','));
  return [header.join(','), ...body].join('\n') + '\n';
}

/**
 * Rekordbox collection XML (File → Import → rekordbox xml). Only tracks that were
 * downloaded can be included - Rekordbox needs a real file.
 * @returns {{ xml: string, included: number, skipped: number }}
 */
export function toRekordboxXML(crate, meta, files) {
  const all = rows(crate, meta, files);
  const local = all.filter((r) => r.file?.path);
  const tracks = local.map((r, i) => {
    const attrs = {
      TrackID: i + 1,
      Name: r.title,
      Artist: r.channel,
      TotalTime: Math.round(r.duration) || 0,
      AverageBpm: r.analysis.bpm ? r.analysis.bpm.toFixed(2) : undefined,
      Tonality: r.analysis.key,
      Comments: r.analysis.camelot ? `${r.analysis.camelot}` : undefined,
      Location: fileUri(r.file.path),
    };
    return `    <TRACK ${Object.entries(attrs).filter(([, v]) => v !== undefined).map(([k, v]) => `${k}="${xml(v)}"`).join(' ')} />`;
  });
  const doc = `<?xml version="1.0" encoding="UTF-8"?>
<DJ_PLAYLISTS Version="1.0.0">
  <PRODUCT Name="DJ Crate" Version="1.0" Company="DJ Crate" />
  <COLLECTION Entries="${local.length}">
${tracks.join('\n')}
  </COLLECTION>
  <PLAYLISTS>
    <NODE Type="0" Name="ROOT" Count="1">
      <NODE Name="${xml(crate.name)}" Type="1" KeyType="0" Entries="${local.length}">
${local.map((_, i) => `        <TRACK Key="${i + 1}" />`).join('\n')}
      </NODE>
    </NODE>
  </PLAYLISTS>
</DJ_PLAYLISTS>
`;
  return { xml: doc, included: local.length, skipped: all.length - local.length };
}

export function saveText(text, fileName, type) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
