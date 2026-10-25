import { useEffect, useMemo, useState } from 'react';
import { FaPlay, FaWaveSquare, FaYoutube, FaListUl } from 'react-icons/fa';
import api, { apiUrl } from '../../lib/api';
import { trackFields, formatTime, formatBytes, compatibleKeys, bpmCompatible, GRADE_INFO } from '../../lib/format';
import useUiStore from '../../stores/uiStore';
import useTrackMetaStore from '../../stores/trackMetaStore';
import useDownloadStore from '../../stores/downloadStore';
import useCrateStore from '../../stores/crateStore';
import useSearchStore from '../../stores/searchStore';
import useSettingsStore, { DOWNLOAD_FORMATS } from '../../stores/settingsStore';
import useTrackActions from '../../hooks/useTrackActions';
import { Button } from '../ui/Button';
import { Badge, KeyBadge, QualityBadge } from '../ui/Badge';
import SidePanel from './SidePanel';
import Waveform from './Waveform';
import TrackMenu from '../track/TrackMenu';

function Stat({ label, children, title }) {
  return (
    <div className="bg-bg-card border border-border rounded-lg px-3 py-2" title={title}>
      <p className="text-[10px] uppercase tracking-wider text-text-muted">{label}</p>
      <p className="text-sm font-semibold text-text-primary tabular mt-0.5">{children ?? '—'}</p>
    </div>
  );
}

function TrackDrawer() {
  const song = useUiStore((s) => s.detailTrack);
  const t = trackFields(song);
  const a = useTrackActions(song);
  const meta = useTrackMetaStore((s) => s.meta[t.videoId]);
  const allMeta = useTrackMetaStore((s) => s.meta);
  const analyzing = useTrackMetaStore((s) => s.analyzing[t.videoId]);
  const file = useDownloadStore((s) => s.files[t.videoId]);
  const lastJob = useDownloadStore((s) => s.jobFor(t.videoId));
  const crates = useCrateStore((s) => s.crates);
  const results = useSearchStore((s) => s.results);
  const defaultFormat = useSettingsStore((s) => s.downloadFormat);
  const [profile, setProfile] = useState(defaultFormat);
  const [probe, setProbe] = useState(null);
  const [probeError, setProbeError] = useState(null);

  // What YouTube offers for this video (formats, best bitrate)
  useEffect(() => {
    setProbe(null);
    setProbeError(null);
    if (!t.videoId) return undefined;
    const controller = new AbortController();
    api.get('/trackInfo', { params: { videoId: t.videoId }, signal: controller.signal })
      .then(({ data }) => {
        setProbe(data);
        useTrackMetaStore.getState().setMeta(t.videoId, { source: { ...(useTrackMetaStore.getState().meta[t.videoId]?.source || {}), grade: data.grade, abr: data.best?.abr, codec: data.best?.codec } });
      })
      .catch((e) => !e.cancelled && setProbeError(e.message));
    return () => controller.abort();
  }, [t.videoId]);

  const analysis = meta?.analysis;

  // Tracks from crates + current results that mix well with this one
  const matches = useMemo(() => {
    if (!analysis?.camelot) return [];
    const keys = compatibleKeys(analysis.camelot);
    const pool = new Map();
    for (const s of [...crates.flatMap((c) => c.tracks), ...results]) pool.set(s.id?.videoId, s);
    pool.delete(t.videoId);
    return [...pool.values()].filter((s) => {
      const m = allMeta[s.id?.videoId]?.analysis;
      return m && keys.includes(m.camelot) && bpmCompatible(analysis.bpm, m.bpm);
    }).slice(0, 8);
  }, [analysis, crates, results, allMeta, t.videoId]);

  if (!song) return null;
  const grade = probe?.grade || meta?.source?.grade;
  const fileJobId = lastJob?.status === 'done' ? lastJob.id : file?.jobId;
  const profileInfo = DOWNLOAD_FORMATS.find((f) => f.value === profile);

  return (
    <SidePanel title="Track details" onClose={() => useUiStore.getState().closeDetail()} width="w-[min(100vw,30rem)]" actions={<TrackMenu song={song} />}>
      <div className="p-4 space-y-5">
        <div className="flex gap-4">
          <img src={t.thumbnail} alt="" className="w-28 h-28 rounded-xl object-cover shrink-0 bg-bg-hover" />
          <div className="min-w-0 flex-1">
            <h3 className="text-base font-semibold text-text-primary leading-snug line-clamp-3">{probe ? `${probe.artist} - ${probe.trackTitle}` : t.title}</h3>
            <p className="text-sm text-text-secondary mt-1 truncate">{t.channel}</p>
            <div className="flex flex-wrap gap-2 mt-3">
              <Button size="sm" variant="primary" onClick={a.play}><FaPlay /> Preview</Button>
              <Button size="sm" onClick={a.queue}><FaListUl /> Queue</Button>
              <Button size="sm" variant="ghost" onClick={a.openYoutube} aria-label="Open on YouTube"><FaYoutube /></Button>
            </div>
          </div>
        </div>

        <section>
          <h4 className="text-[11px] font-semibold uppercase tracking-wider text-text-muted mb-2">Analysis</h4>
          {analysis ? (
            <div className="grid grid-cols-3 gap-2">
              <Stat label="BPM">{analysis.bpm?.toFixed(1)}</Stat>
              <Stat label="Key" title={analysis.keyConfidence < 0.25 ? 'Low confidence - check by ear' : undefined}>
                <span className="inline-flex items-center gap-2"><KeyBadge camelot={analysis.camelot} keyName={analysis.key} confidence={analysis.keyConfidence} /> {analysis.key}</span>
              </Stat>
              <Stat label="Length">{formatTime(probe?.duration || t.duration)}</Stat>
              <Stat label="Loudness" title="Integrated loudness, EBU R128. Measured only - audio is never changed.">{analysis.lufs !== null ? `${analysis.lufs} LUFS` : null}</Stat>
              <Stat label="True peak" title={analysis.clipping ? 'The source master peaks above 0 dBTP' : undefined}>
                <span className={analysis.clipping ? 'text-warning' : ''}>{analysis.truePeakDb !== null ? `${analysis.truePeakDb} dBTP` : null}</span>
              </Stat>
              <Stat label="Bandwidth" title="Highest frequency with real content. Lossy sources are low-passed.">{analysis.cutoffKHz ? `${analysis.cutoffKHz} kHz` : null}</Stat>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-3 bg-bg-card border border-border rounded-lg p-3">
              <p className="text-xs text-text-secondary">Get BPM, Camelot key and loudness without saving a file.</p>
              <Button size="sm" variant="neon" onClick={a.analyze} disabled={analyzing}><FaWaveSquare /> {analyzing ? 'Analysing…' : 'Analyze'}</Button>
            </div>
          )}
        </section>

        <section>
          <h4 className="text-[11px] font-semibold uppercase tracking-wider text-text-muted mb-2">Source quality</h4>
          {probeError ? <p className="text-xs text-danger">{probeError}</p> : !probe ? <p className="text-xs text-text-muted">Checking available streams…</p> : (
            <div className="bg-bg-card border border-border rounded-lg p-3">
              <div className="flex items-center gap-2">
                <QualityBadge grade={grade} />
                <p className="text-xs text-text-secondary">{GRADE_INFO[grade]?.text}</p>
              </div>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {probe.formats.filter((f) => !f.drc).slice(0, 4).map((f) => (
                  <Badge key={f.id} tone={f.id === probe.best?.id ? 'neon' : 'neutral'}>{f.codec} {f.abr}k · {f.sampleRate / 1000}kHz</Badge>
                ))}
              </div>
              {grade !== 'high' && <p className="text-[11px] text-text-muted mt-2">Signed in to YouTube Premium in your cookies browser? Premium unlocks 256k streams for many tracks.</p>}
            </div>
          )}
        </section>

        <section>
          <h4 className="text-[11px] font-semibold uppercase tracking-wider text-text-muted mb-2">Download</h4>
          <div className="grid grid-cols-3 gap-1.5 mb-2" role="radiogroup" aria-label="Format for this download">
            {DOWNLOAD_FORMATS.map((f) => (
              <button
                key={f.value}
                type="button"
                role="radio"
                aria-checked={profile === f.value}
                disabled={f.value === 'm4a' && probe && !probe.hasAac}
                onClick={() => setProfile(f.value)}
                className={`px-2 py-2 rounded-lg text-xs font-medium border transition-colors disabled:opacity-40 ${profile === f.value ? 'border-accent bg-accent/10 text-accent' : 'border-border bg-bg-card text-text-secondary hover:text-text-primary'}`}
              >
                {f.label}
              </button>
            ))}
          </div>
          <p className="text-[11px] text-text-muted mb-3 leading-relaxed">{profileInfo?.hint}</p>
          <Button variant="primary" className="w-full" onClick={() => a.download(profile)}>Download {profileInfo?.label}</Button>
          {file && <p className="text-[11px] text-text-muted mt-2 truncate" title={file.path}>Saved: {file.fileName}</p>}
        </section>

        {fileJobId && (
          <section>
            <h4 className="text-[11px] font-semibold uppercase tracking-wider text-text-muted mb-2">Downloaded file</h4>
            <Waveform url={apiUrl(`/downloads/${fileJobId}/file`)} />
            {lastJob?.output && (
              <p className="text-[11px] text-text-muted mt-1 tabular">
                {lastJob.output.codec} · {lastJob.output.sampleRate / 1000}kHz{lastJob.output.bitsPerSample ? ` · ${lastJob.output.bitsPerSample}-bit` : ''} · {formatBytes(lastJob.output.size)}{lastJob.output.hasCover ? ' · artwork' : ''}
              </p>
            )}
          </section>
        )}

        {analysis?.camelot && (
          <section>
            <h4 className="text-[11px] font-semibold uppercase tracking-wider text-text-muted mb-2">Mixes well with</h4>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {compatibleKeys(analysis.camelot).map((k) => <KeyBadge key={k} camelot={k} />)}
              {analysis.bpm && <Badge>{Math.round(analysis.bpm * 0.94)}–{Math.round(analysis.bpm * 1.06)} BPM</Badge>}
            </div>
            {matches.length ? (
              <ul className="list-none space-y-1">
                {matches.map((m) => {
                  const mt = trackFields(m);
                  const ma = allMeta[mt.videoId].analysis;
                  return (
                    <li key={mt.videoId}>
                      <button type="button" onClick={() => useUiStore.getState().openDetail(m)} className="w-full flex items-center gap-3 p-1.5 rounded-lg hover:bg-bg-hover bg-transparent border-none text-left">
                        <img src={mt.thumbnailSmall} alt="" className="w-8 h-8 rounded object-cover" />
                        <span className="flex-1 min-w-0 text-sm text-text-primary truncate">{mt.title}</span>
                        <span className="text-xs text-text-secondary tabular">{ma.bpm?.toFixed(0)}</span>
                        <KeyBadge camelot={ma.camelot} />
                      </button>
                    </li>
                  );
                })}
              </ul>
            ) : <p className="text-[11px] text-text-muted">Analyze more tracks in your crates to see matches here.</p>}
          </section>
        )}
      </div>
    </SidePanel>
  );
}

export default TrackDrawer;
