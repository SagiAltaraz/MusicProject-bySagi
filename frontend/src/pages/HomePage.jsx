import { Link } from 'react-router-dom';
import { FaBoxOpen, FaHistory, FaPlay } from 'react-icons/fa';
import useSearchStore from '../stores/searchStore';
import usePlayerStore from '../stores/playerStore';
import useCrateStore from '../stores/crateStore';
import useSettingsStore, { MAX_DURATION_OPTIONS } from '../stores/settingsStore';
import TrackCollection from '../components/track/TrackCollection';
import { trackFields } from '../lib/format';

const GENRE_TILES = [
  // "extended mix" / "original mix" steers YouTube toward single tracks, not hour-long DJ sets
  { label: 'Peak-time Techno', query: 'peak time techno extended mix 2025', from: '#ff6b35', to: '#d7263d' },
  { label: 'Melodic & Progressive', query: 'melodic techno extended mix 2025', from: '#7b2ff7', to: '#00d4ff' },
  { label: 'Tech House', query: 'tech house extended mix 2025', from: '#00b894', to: '#0984e3' },
  { label: 'Afro House', query: 'afro house original mix 2025', from: '#f5b942', to: '#e17055' },
  { label: 'Drum & Bass', query: 'drum and bass 2025 official audio', from: '#00d4ff', to: '#2d3436' },
  { label: 'Deep House', query: 'deep house original mix 2025', from: '#6c5ce7', to: '#2d3436' },
  { label: 'UK Garage', query: 'uk garage 2025 official audio', from: '#fd79a8', to: '#6c5ce7' },
  { label: 'Hard Techno', query: 'hard techno original mix 2025', from: '#d63031', to: '#2d3436' },
];

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 5) return 'Late night session';
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

function SectionTitle({ children, to, action }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <h2 className="text-lg font-semibold text-text-primary">{children}</h2>
      {to && <Link to={to} className="text-xs text-text-secondary hover:text-accent no-underline">{action}</Link>}
    </div>
  );
}

function Landing() {
  const { search, searchHistory } = useSearchStore();
  const { history, playTrack } = usePlayerStore();
  const crates = useCrateStore((s) => s.crates);

  return (
    <div className="space-y-10">
      <section>
        <SectionTitle>Dig by vibe</SectionTitle>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {GENRE_TILES.map((g) => (
            <button
              key={g.label}
              type="button"
              onClick={() => search(g.query)}
              className="relative h-24 rounded-(--radius-card) overflow-hidden border-none text-left p-4 group"
              style={{ background: `linear-gradient(135deg, ${g.from}, ${g.to})` }}
            >
              <span className="absolute inset-0 bg-black/10 group-hover:bg-black/0 transition-colors" />
              <span className="relative text-white font-bold text-base drop-shadow">{g.label}</span>
            </button>
          ))}
        </div>
      </section>

      {history.length > 0 && (
        <section>
          <SectionTitle>Recently previewed</SectionTitle>
          <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1">
            {history.slice(0, 12).map((song) => {
              const t = trackFields(song);
              return (
                <button key={t.videoId} type="button" onClick={() => playTrack(song)} className="group w-40 shrink-0 text-left bg-transparent border-none p-0">
                  <span className="relative block aspect-video rounded-lg overflow-hidden bg-bg-hover">
                    <img src={t.thumbnail} alt="" loading="lazy" className="w-full h-full object-cover" />
                    <span className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/40 transition-colors">
                      <FaPlay className="text-white opacity-0 group-hover:opacity-100" />
                    </span>
                  </span>
                  <span className="block text-xs text-text-primary mt-1.5 line-clamp-2">{t.title}</span>
                </button>
              );
            })}
          </div>
        </section>
      )}

      <div className="grid md:grid-cols-2 gap-8">
        {searchHistory.length > 0 && (
          <section>
            <SectionTitle>Recent searches</SectionTitle>
            <div className="flex flex-wrap gap-2">
              {searchHistory.slice(0, 10).map((q) => (
                <button key={q} type="button" onClick={() => search(q)} className="flex items-center gap-2 px-3 py-1.5 bg-bg-card border border-border rounded-full text-sm text-text-secondary hover:text-text-primary hover:border-accent/50">
                  <FaHistory className="text-[10px] text-text-muted" /> {q}
                </button>
              ))}
            </div>
          </section>
        )}
        {crates.length > 0 && (
          <section>
            <SectionTitle to="/crates" action="All crates">Your crates</SectionTitle>
            <div className="grid grid-cols-2 gap-2">
              {crates.slice(0, 6).map((c) => (
                <Link key={c.id} to={`/crates/${c.id}`} className="flex items-center gap-3 p-3 bg-bg-card border border-border rounded-lg hover:border-accent/40 no-underline">
                  <FaBoxOpen className="text-accent shrink-0" />
                  <span className="text-sm text-text-primary truncate flex-1">{c.name}</span>
                  <span className="text-xs text-text-muted tabular">{c.tracks.length}</span>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

function HomePage() {
  const { results, query, isLoading, error, search, hiddenLong } = useSearchStore();
  const { maxDuration, setSetting } = useSettingsStore();

  return (
    <div className="max-w-7xl mx-auto pb-6">
      <h1 className="text-2xl sm:text-3xl font-bold mb-6 bg-linear-to-r from-accent to-neon bg-clip-text text-transparent">
        {query ? `Results for “${query}”` : getGreeting()}
      </h1>

      {error && (
        <div role="alert" className="flex items-center gap-3 bg-danger/10 border border-danger/30 rounded-lg p-4 mb-6 text-danger text-sm">
          <span className="flex-1">{error}</span>
          {query && <button type="button" onClick={() => search(query)} className="font-semibold bg-transparent border-none text-danger hover:text-text-primary">Retry</button>}
        </div>
      )}

      {!query && !isLoading && <Landing />}

      {isLoading && (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(15rem,1fr))] gap-4" aria-busy="true" aria-label="Loading results">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="bg-bg-card rounded-(--radius-card) overflow-hidden border border-border animate-pulse">
              <div className="aspect-video bg-bg-hover" />
              <div className="p-3 space-y-2">
                <div className="h-4 bg-bg-hover rounded w-3/4" />
                <div className="h-3 bg-bg-hover rounded w-1/2" />
                <div className="h-9 bg-bg-hover rounded mt-2" />
              </div>
            </div>
          ))}
        </div>
      )}

      {!isLoading && query && !error && (
        results.length > 0 ? (
          <TrackCollection
            songs={results}
            toolbarExtra={(
              <select
                value={maxDuration}
                onChange={(e) => {
                  setSetting('maxDuration', Number(e.target.value));
                  search(query);
                }}
                aria-label="Track length"
                className="h-9 px-2 bg-bg-input border border-border rounded-lg text-sm text-text-primary outline-none focus:border-accent"
              >
                {MAX_DURATION_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            )}
          />
        ) : (
          <div className="text-center py-16">
            <p className="text-text-secondary text-lg">No tracks found for “{query}”</p>
            {hiddenLong > 0 ? (
              <>
                <p className="text-text-muted text-sm mt-2">{hiddenLong} longer videos (DJ sets and mixes) were hidden by the length filter.</p>
                <button
                  type="button"
                  onClick={() => {
                    setSetting('maxDuration', 0);
                    search(query);
                  }}
                  className="mt-4 px-4 py-2 rounded-lg bg-bg-hover text-text-primary hover:bg-border-light border-none text-sm"
                >
                  Show them
                </button>
              </>
            ) : <p className="text-text-muted text-sm mt-2">Try another spelling or fewer words.</p>}
          </div>
        )
      )}
    </div>
  );
}

export default HomePage;
