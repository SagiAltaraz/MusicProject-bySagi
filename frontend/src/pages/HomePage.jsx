import { motion } from 'framer-motion';
import SongCard from '../components/songcard/SongCard';
import useSearchStore from '../stores/searchStore';

const FEATURED_SEARCHES = [
  { label: 'Top Techno 2025', query: 'techno 2025 best tracks' },
  { label: 'Deep House Vibes', query: 'deep house mix 2025' },
  { label: 'Festival Bangers', query: 'festival music 2025 big room' },
  { label: 'Underground', query: 'underground techno dark' },
  { label: 'Chill & Melodic', query: 'melodic techno chill' },
  { label: 'D&B Essentials', query: 'drum and bass 2025' },
];

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good Morning';
  if (hour < 18) return 'Good Afternoon';
  return 'Good Evening';
}

function HomePage() {
  const { results, query, isLoading, error, search } = useSearchStore();

  return (
    <div className="max-w-7xl mx-auto pb-6">
      {/* Greeting or search results header */}
      <h1 className="text-3xl font-bold mb-6 bg-linear-to-r from-accent to-neon bg-clip-text text-transparent">
        {query ? `Results for "${query}"` : getGreeting()}
      </h1>

      {/* Error state */}
      {error && (
        <div className="bg-danger/10 border border-danger/30 rounded-lg p-4 mb-6 text-danger text-sm">
          {error}
        </div>
      )}

      {/* Featured quick searches (show when no results) */}
      {results.length === 0 && !isLoading && !error && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-text-primary mb-4">Quick Start</h2>
          <div className="flex flex-wrap gap-3">
            {FEATURED_SEARCHES.map((item) => (
              <motion.button
                key={item.label}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => search(item.query)}
                className="px-5 py-2.5 bg-bg-card border border-border rounded-full text-sm text-text-secondary hover:text-text-primary hover:border-accent/50 hover:shadow-[0_0_15px_var(--color-accent-glow)] transition-all duration-300 cursor-pointer"
              >
                {item.label}
              </motion.button>
            ))}
          </div>
        </div>
      )}

      {/* Loading skeleton */}
      {isLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="bg-bg-card rounded-xl overflow-hidden border border-border animate-pulse">
              <div className="aspect-video bg-bg-hover" />
              <div className="p-3 space-y-2">
                <div className="h-4 bg-bg-hover rounded w-3/4" />
                <div className="h-3 bg-bg-hover rounded w-1/2" />
                <div className="h-8 bg-bg-hover rounded mt-2" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Results grid */}
      {!isLoading && results.length > 0 && (
        <motion.div
          initial="hidden"
          animate="visible"
          variants={{
            visible: { transition: { staggerChildren: 0.05 } },
          }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
        >
          {results.map((song) => (
            <SongCard key={song.id?.videoId || song.etag} song={song} />
          ))}
        </motion.div>
      )}

      {/* Empty state */}
      {!isLoading && results.length === 0 && query && !error && (
        <div className="text-center py-16">
          <p className="text-text-muted text-lg">No tracks found for &quot;{query}&quot;</p>
          <p className="text-text-muted text-sm mt-2">Try a different search term</p>
        </div>
      )}
    </div>
  );
}

export default HomePage;
