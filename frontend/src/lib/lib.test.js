import { describe, expect, test } from 'vitest';
import { bpmCompatible, compatibleKeys, decodeHtml, formatTime, tracksLabel, trackFields } from './format';
import { parseTracks } from './chat';
import { toCSV, toM3U, toRekordboxXML } from './export';

const song = (id, title, channel = 'Artist - Topic', duration = 300) => ({
  id: { videoId: id },
  durationSeconds: duration,
  snippet: { title, channelTitle: channel, thumbnails: { default: { url: `https://i.ytimg.com/${id}.jpg` } } },
});

describe('format', () => {
  test('formatTime', () => {
    expect(formatTime(0)).toBe('0:00');
    expect(formatTime(65)).toBe('1:05');
    expect(formatTime(3725)).toBe('1:02:05');
  });

  test('tracksLabel pluralises', () => {
    expect(tracksLabel(1)).toBe('1 track');
    expect(tracksLabel(0)).toBe('0 tracks');
  });

  test('decodeHtml without a DOM', () => {
    expect(decodeHtml('Rock &amp; Roll &quot;Live&quot; &#39;99')).toBe('Rock & Roll "Live" \'99');
  });

  test('trackFields strips " - Topic"', () => {
    expect(trackFields(song('a', 'X')).channel).toBe('Artist');
  });

  test('compatibleKeys wraps round the wheel', () => {
    expect(compatibleKeys('8A')).toEqual(['8A', '7A', '9A', '8B']);
    expect(compatibleKeys('12B')).toEqual(['12B', '11B', '1B', '12A']);
    expect(compatibleKeys('1A')).toEqual(['1A', '12A', '2A', '1B']);
    expect(compatibleKeys('nope')).toEqual([]);
  });

  test('bpmCompatible accepts half and double time', () => {
    expect(bpmCompatible(124, 126)).toBe(true);
    expect(bpmCompatible(124, 140)).toBe(false);
    expect(bpmCompatible(87, 174)).toBe(true);
    expect(bpmCompatible(null, 120)).toBe(false);
  });
});

describe('parseTracks', () => {
  test('pulls "Artist - Title" lines out of a reply', () => {
    const reply = [
      'Here are some ideas:',
      '1. **Bicep - Glue** — 130 BPM, 10A',
      '2. Peggy Gou – Starry Night (124 BPM)',
      '- Fred again.. - Delilah (pull me out of this)',
      'Mix them in this order for a smooth build.',
    ].join('\n');
    expect(parseTracks(reply)).toEqual([
      'Bicep - Glue',
      'Peggy Gou – Starry Night',
      'Fred again.. - Delilah (pull me out of this)',
    ]);
  });

  test('ignores plain prose', () => {
    expect(parseTracks('Try mixing in key - it really helps.')).toEqual([]);
  });
});

describe('export', () => {
  const crate = { name: 'Peak <Time> & "More"', tracks: [song('a1', 'Track &amp; One'), song('b2', 'Two')] };
  const meta = { a1: { analysis: { bpm: 128.04, key: 'Am', camelot: '8A', lufs: -8.1 } } };
  const files = { a1: { path: '/Users/dj/Downloads/Artist - Track & One.aiff' } };

  test('M3U uses file paths when downloaded, YouTube otherwise', () => {
    const m3u = toM3U(crate, meta, files);
    expect(m3u).toContain('#EXTM3U');
    expect(m3u).toContain('#EXTINF:300,Track & One\n/Users/dj/Downloads/Artist - Track & One.aiff');
    expect(m3u).toContain('https://www.youtube.com/watch?v=b2');
  });

  test('CSV quotes cells that need it', () => {
    const csv = toCSV({ ...crate, tracks: [song('c3', 'Hello, "World"')] }, {}, {});
    expect(csv.split('\n')[1]).toMatch(/^"Hello, ""World"""/);
  });

  test('Rekordbox XML includes only downloaded tracks and escapes names', () => {
    const { xml, included, skipped } = toRekordboxXML(crate, meta, files);
    expect(included).toBe(1);
    expect(skipped).toBe(1);
    expect(xml).toContain('Name="Peak &lt;Time&gt; &amp; &quot;More&quot;"');
    expect(xml).toContain('AverageBpm="128.04"');
    expect(xml).toContain('Tonality="Am"');
    expect(xml).toContain('Location="file://localhost/Users/dj/Downloads/Artist%20-%20Track%20%26%20One.aiff"');
  });
});
