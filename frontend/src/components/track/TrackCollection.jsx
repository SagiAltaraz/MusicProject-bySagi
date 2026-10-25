import { useMemo, useState } from 'react';
import { FaThLarge, FaList, FaSearch } from 'react-icons/fa';
import useSettingsStore from '../../stores/settingsStore';
import useTrackMetaStore from '../../stores/trackMetaStore';
import { decodeHtml } from '../../lib/format';
import { IconButton } from '../ui/Button';
import SongCard from '../songcard/SongCard';
import TrackTable from './TrackTable';

const SORTS = {
  default: { label: 'Default', fn: null },
  title: { label: 'Title A-Z', fn: (a, b) => decodeHtml(a.snippet.title).localeCompare(decodeHtml(b.snippet.title)) },
  duration: { label: 'Shortest first', fn: (a, b) => (a.durationSeconds || 0) - (b.durationSeconds || 0) },
  bpm: { label: 'BPM', fn: null }, // needs meta, handled below
  key: { label: 'Key (Camelot)', fn: null },
};

const camelotOrder = (c) => (c ? parseInt(c, 10) * 2 + (c.endsWith('B') ? 1 : 0) : 999);

/**
 * Grid/table view with sort and filter, shared by search results and crates.
 */
function TrackCollection({ songs, onRemove, reorder, filterable = false, toolbarExtra }) {
  const { viewMode, setSetting } = useSettingsStore();
  const meta = useTrackMetaStore((s) => s.meta);
  const [sort, setSort] = useState('default');
  const [filter, setFilter] = useState('');

  const shown = useMemo(() => {
    let list = songs;
    if (filter.trim()) {
      const q = filter.toLowerCase();
      list = list.filter((s) => `${decodeHtml(s.snippet?.title)} ${decodeHtml(s.snippet?.channelTitle)}`.toLowerCase().includes(q));
    }
    const a = (s) => meta[s.id?.videoId]?.analysis;
    const fn = sort === 'bpm' ? (x, y) => (a(x)?.bpm || 999) - (a(y)?.bpm || 999)
      : sort === 'key' ? (x, y) => camelotOrder(a(x)?.camelot) - camelotOrder(a(y)?.camelot)
        : SORTS[sort].fn;
    return fn ? [...list].sort(fn) : list;
  }, [songs, filter, sort, meta]);

  // Reordering only makes sense on the unsorted, unfiltered list
  const canReorder = reorder && sort === 'default' && !filter.trim();

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 mb-4">
        {filterable && (
          <label className="relative flex-1 min-w-44 max-w-xs">
            <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted text-xs" aria-hidden />
            <input
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Filter tracks…"
              aria-label="Filter tracks"
              className="w-full h-9 pl-8 pr-3 bg-bg-input border border-border rounded-lg text-sm text-text-primary placeholder:text-text-muted outline-none focus:border-accent"
            />
          </label>
        )}
        {toolbarExtra}
        <div className="ml-auto flex items-center gap-2">
          <label className="text-xs text-text-muted flex items-center gap-2">
            Sort
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="h-9 px-2 bg-bg-input border border-border rounded-lg text-sm text-text-primary outline-none focus:border-accent"
            >
              {Object.entries(SORTS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </label>
          <div className="flex bg-bg-input border border-border rounded-lg p-0.5" role="group" aria-label="View">
            <IconButton size="sm" label="Grid view" active={viewMode === 'grid'} onClick={() => setSetting('viewMode', 'grid')} className="rounded-md!"><FaThLarge /></IconButton>
            <IconButton size="sm" label="Table view" active={viewMode === 'table'} onClick={() => setSetting('viewMode', 'table')} className="rounded-md!"><FaList /></IconButton>
          </div>
        </div>
      </div>

      {shown.length === 0 && filter && <p className="text-sm text-text-muted py-8 text-center">No tracks match “{filter}”.</p>}

      {viewMode === 'table' ? (
        <TrackTable songs={shown} onRemove={onRemove} reorder={canReorder ? reorder : undefined} />
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(15rem,1fr))] gap-4">
          {shown.map((song) => (
            <SongCard key={song.id?.videoId || song.etag} song={song} onRemove={onRemove ? () => onRemove(song) : undefined} />
          ))}
        </div>
      )}
    </div>
  );
}

export default TrackCollection;
