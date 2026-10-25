import { Link, useNavigate, useParams } from 'react-router-dom';
import { FaBoxOpen, FaPlus, FaTrash, FaEdit, FaPlay, FaDownload, FaFileExport, FaWaveSquare, FaArrowLeft } from 'react-icons/fa';
import { motion, AnimatePresence } from 'framer-motion';
import useCrateStore from '../stores/crateStore';
import useUiStore from '../stores/uiStore';
import usePlayerStore from '../stores/playerStore';
import useDownloadStore from '../stores/downloadStore';
import useTrackMetaStore from '../stores/trackMetaStore';
import useSettingsStore, { DOWNLOAD_FORMATS } from '../stores/settingsStore';
import { toast } from '../stores/toastStore';
import { formatTime, tracksLabel } from '../lib/format';
import { toM3U, toCSV, toRekordboxXML, saveText } from '../lib/export';
import TrackCollection from '../components/track/TrackCollection';
import { Button } from '../components/ui/Button';
import { Popover, MenuItem, MenuLabel } from '../components/ui/Popover';

const safeName = (name) => name.replace(/[/\\:*?"<>|]/g, ' ').trim() || 'crate';

function CrateDetail({ crate }) {
  const { removeTrack, restoreTrack, moveTrack } = useCrateStore.getState();
  const { openModal } = useUiStore.getState();
  const meta = useTrackMetaStore((s) => s.meta);
  const files = useDownloadStore((s) => s.files);
  const format = useSettingsStore((s) => s.downloadFormat);
  const navigate = useNavigate();

  const total = crate.tracks.reduce((s, t) => s + (t.durationSeconds || 0), 0);
  const downloaded = crate.tracks.filter((t) => files[t.id?.videoId]).length;
  const unanalysed = crate.tracks.filter((t) => !meta[t.id?.videoId]?.analysis);

  const remove = (song) => {
    const removed = removeTrack(crate.id, song.id?.videoId);
    if (removed) toast({ title: 'Removed from crate', action: { label: 'Undo', onClick: () => restoreTrack(removed) } });
  };

  const downloadAll = (profile) => {
    const pending = crate.tracks.filter((t) => !files[t.id?.videoId]);
    const list = pending.length ? pending : crate.tracks;
    list.forEach((t) => useDownloadStore.getState().start(t, profile));
    toast({ tone: 'info', title: `Queued ${list.length} downloads`, message: 'Follow progress in Downloads (D).', action: { label: 'Open', onClick: () => useUiStore.getState().toggleDownloads() } });
  };

  const analyzeAll = async () => {
    toast({ tone: 'info', title: `Analysing ${tracksLabel(unanalysed.length)}`, message: 'BPM and key will fill in as each one finishes.' });
    // Two at a time - matches the server's download concurrency
    const queue = [...unanalysed];
    const worker = async () => {
      while (queue.length) await useTrackMetaStore.getState().analyze(queue.shift().id.videoId, { silent: true });
    };
    await Promise.all([worker(), worker()]);
  };

  const exportAs = (kind) => {
    const base = safeName(crate.name);
    if (kind === 'm3u') saveText(toM3U(crate, meta, files), `${base}.m3u8`, 'audio/x-mpegurl');
    if (kind === 'csv') saveText(toCSV(crate, meta, files), `${base}.csv`, 'text/csv');
    if (kind === 'rekordbox') {
      const { xml, included, skipped } = toRekordboxXML(crate, meta, files);
      if (!included) {
        toast({ tone: 'error', title: 'Nothing to export yet', message: 'Rekordbox needs real files - download the tracks first.' });
        return;
      }
      saveText(xml, `${base} - rekordbox.xml`, 'application/xml');
      toast({
        tone: 'success',
        title: `Exported ${tracksLabel(included)} for Rekordbox`,
        message: `${skipped ? `${skipped} not downloaded yet were skipped. ` : ''}In Rekordbox: Preferences → Advanced → rekordbox xml, then import.`,
        duration: 9000,
      });
    }
  };

  return (
    <div className="max-w-7xl mx-auto pb-6">
      <Link to="/crates" className="inline-flex items-center gap-2 text-xs text-text-secondary hover:text-accent no-underline mb-4"><FaArrowLeft /> All crates</Link>
      <div className="flex flex-wrap items-center gap-4 mb-6">
        <div className="w-16 h-16 rounded-xl bg-linear-to-br from-accent to-neon flex items-center justify-center shrink-0">
          <FaBoxOpen className="text-white text-2xl" aria-hidden />
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl sm:text-3xl font-bold text-text-primary truncate">{crate.name}</h1>
          <p className="text-text-secondary text-sm tabular">
            {tracksLabel(crate.tracks.length)}{total ? ` · ${formatTime(total)}` : ''}{downloaded ? ` · ${downloaded} downloaded` : ''}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="primary" onClick={() => usePlayerStore.getState().playList(crate.tracks)} disabled={!crate.tracks.length}><FaPlay /> Play all</Button>
          <Popover
            renderTrigger={({ toggle, props }) => <Button onClick={toggle} disabled={!crate.tracks.length} {...props}><FaDownload /> Download all</Button>}
            className="w-60"
          >
            {(close) => (
              <>
                <MenuLabel>{downloaded && downloaded < crate.tracks.length ? 'Missing tracks as' : 'Every track as'}</MenuLabel>
                {DOWNLOAD_FORMATS.map((f) => (
                  <MenuItem key={f.value} icon={<FaDownload />} hint={f.detail} onClick={() => { downloadAll(f.value); close(); }}>
                    {f.label}{f.value === format ? ' (default)' : ''}
                  </MenuItem>
                ))}
              </>
            )}
          </Popover>
          {unanalysed.length > 0 && <Button variant="neon" onClick={analyzeAll}><FaWaveSquare /> Analyze {unanalysed.length}</Button>}
          <Popover renderTrigger={({ toggle, props }) => <Button variant="ghost" onClick={toggle} {...props}><FaFileExport /> Export</Button>} className="w-64">
            {(close) => (
              <>
                <MenuItem onClick={() => { exportAs('rekordbox'); close(); }} hint="Downloaded tracks with BPM & key">Rekordbox XML</MenuItem>
                <MenuItem onClick={() => { exportAs('m3u'); close(); }} hint="Playlist for Serato, Traktor, VLC">M3U playlist</MenuItem>
                <MenuItem onClick={() => { exportAs('csv'); close(); }} hint="Spreadsheet with BPM, key, loudness">CSV</MenuItem>
              </>
            )}
          </Popover>
          <Popover renderTrigger={({ toggle, props }) => <Button variant="ghost" onClick={toggle} aria-label="Crate options" {...props}>⋯</Button>} className="w-44">
            {(close) => (
              <>
                <MenuItem icon={<FaEdit />} onClick={() => { openModal({ type: 'renameCrate', crate }); close(); }}>Rename</MenuItem>
                <MenuItem
                  icon={<FaTrash />}
                  danger
                  onClick={() => {
                    close();
                    openModal({
                      type: 'confirm',
                      title: `Delete “${crate.name}”?`,
                      message: `${tracksLabel(crate.tracks.length)} will be removed from this crate. Downloaded files stay on disk.`,
                      confirmLabel: 'Delete',
                      danger: true,
                      onConfirm: () => {
                        const deleted = useCrateStore.getState().deleteCrate(crate.id);
                        navigate('/crates');
                        toast({ title: 'Crate deleted', action: { label: 'Undo', onClick: () => useCrateStore.getState().restoreCrate(deleted) } });
                      },
                    });
                  }}
                >
                  Delete crate
                </MenuItem>
              </>
            )}
          </Popover>
        </div>
      </div>

      {crate.tracks.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-border rounded-(--radius-card)">
          <FaBoxOpen className="text-text-muted text-4xl mx-auto mb-4" aria-hidden />
          <p className="text-text-secondary text-lg">This crate is empty</p>
          <p className="text-text-muted text-sm mt-2">Search for tracks, then drag them onto the crate in the sidebar or use ⋯ → Add to crate.</p>
        </div>
      ) : (
        <TrackCollection songs={crate.tracks} onRemove={remove} reorder={(from, to) => moveTrack(crate.id, from, to)} filterable />
      )}
    </div>
  );
}

function CratesPage() {
  const { crateId } = useParams();
  const crates = useCrateStore((s) => s.crates);
  const openModal = useUiStore((s) => s.openModal);

  if (crateId) {
    const crate = crates.find((c) => c.id === crateId);
    if (crate) return <CrateDetail crate={crate} />;
    return (
      <div className="text-center py-20">
        <p className="text-text-secondary">That crate doesn't exist (anymore).</p>
        <Link to="/crates" className="text-accent text-sm">Back to crates</Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto pb-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold bg-linear-to-r from-accent to-neon bg-clip-text text-transparent">My Crates</h1>
        <Button variant="primary" onClick={() => openModal({ type: 'createCrate' })}><FaPlus /> New crate</Button>
      </div>

      {crates.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-border rounded-(--radius-card)">
          <FaBoxOpen className="text-text-muted text-5xl mx-auto mb-4" aria-hidden />
          <p className="text-text-secondary text-lg">No crates yet</p>
          <p className="text-text-muted text-sm mt-2 mb-6">Crates are your set lists: warm-up, peak time, closing…</p>
          <Button variant="primary" onClick={() => openModal({ type: 'createCrate' })}><FaPlus /> Create your first crate</Button>
        </div>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(16rem,1fr))] gap-4">
          <AnimatePresence>
            {crates.map((crate) => {
              const total = crate.tracks.reduce((s, t) => s + (t.durationSeconds || 0), 0);
              const covers = crate.tracks.slice(0, 4).map((t) => t.snippet?.thumbnails?.medium?.url || t.snippet?.thumbnails?.default?.url);
              return (
                <motion.div key={crate.id} layout initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}>
                  <Link
                    to={`/crates/${crate.id}`}
                    className="group block bg-bg-card border border-border rounded-(--radius-card) overflow-hidden hover:border-accent/40 hover:shadow-[0_8px_30px_var(--color-accent-glow)] transition-all duration-300 no-underline"
                  >
                    <div className="grid grid-cols-2 aspect-[2/1] bg-bg-hover">
                      {covers.length ? covers.map((src, i) => <img key={i} src={src} alt="" loading="lazy" className="w-full h-full object-cover" />) : (
                        <div className="col-span-2 flex items-center justify-center"><FaBoxOpen className="text-text-muted text-3xl" /></div>
                      )}
                    </div>
                    <div className="p-4">
                      <h3 className="text-base font-semibold text-text-primary truncate">{crate.name}</h3>
                      <p className="text-sm text-text-secondary tabular">{tracksLabel(crate.tracks.length)}{total ? ` · ${formatTime(total)}` : ''}</p>
                    </div>
                  </Link>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}

export default CratesPage;
