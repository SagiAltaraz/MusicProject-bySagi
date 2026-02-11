import { useState } from 'react';
import { Link } from 'react-router-dom';
import { FaPlus, FaBoxOpen, FaChevronDown, FaChevronRight } from 'react-icons/fa';
import { motion, AnimatePresence } from 'framer-motion';
import useSearchStore from '../../stores/searchStore';
import useCrateStore from '../../stores/crateStore';

const GENRES = [
  'Acid House', 'Afrobeat', 'Ambient', 'Big Room', 'Breakbeat',
  'Deep House', 'Disco', 'Drum and Bass', 'Dubstep', 'Electro',
  'Future Bass', 'Garage', 'Hard Techno', 'Hardstyle', 'Hip Hop',
  'House', 'Jungle', 'Minimal Techno', 'Progressive House',
  'Psytrance', 'Tech House', 'Techno', 'Trance', 'Trap',
];

function Sidebar() {
  const [genresOpen, setGenresOpen] = useState(true);
  const [cratesOpen, setCratesOpen] = useState(true);
  const { search } = useSearchStore();
  const { crates, createCrate } = useCrateStore();

  const handleGenreClick = (genre) => {
    search(`${genre} music`);
  };

  const handleNewCrate = () => {
    const name = prompt('Crate name:');
    if (name?.trim()) createCrate(name.trim());
  };

  return (
    <aside className="w-56 shrink-0 bg-bg-secondary border-r border-border overflow-y-auto">
      {/* Genres Section */}
      <div className="p-4">
        <button
          onClick={() => setGenresOpen(!genresOpen)}
          className="flex items-center justify-between w-full text-xs font-semibold uppercase tracking-wider text-text-muted hover:text-text-primary transition-colors mb-3 bg-transparent border-none cursor-pointer"
        >
          <span>Genres</span>
          {genresOpen ? <FaChevronDown className="text-[10px]" /> : <FaChevronRight className="text-[10px]" />}
        </button>

        <AnimatePresence>
          {genresOpen && (
            <motion.ul
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="list-none overflow-hidden"
            >
              {GENRES.map((genre) => (
                <li key={genre}>
                  <button
                    onClick={() => handleGenreClick(genre)}
                    className="w-full text-left px-3 py-1.5 text-sm text-text-secondary hover:text-text-primary hover:bg-bg-hover rounded-md transition-all duration-150 bg-transparent border-none cursor-pointer"
                  >
                    {genre}
                  </button>
                </li>
              ))}
            </motion.ul>
          )}
        </AnimatePresence>
      </div>

      {/* Divider */}
      <div className="h-px bg-border mx-4" />

      {/* Crates Section */}
      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <button
            onClick={() => setCratesOpen(!cratesOpen)}
            className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-text-muted hover:text-text-primary transition-colors bg-transparent border-none cursor-pointer"
          >
            <span>Crates</span>
            {cratesOpen ? <FaChevronDown className="text-[10px]" /> : <FaChevronRight className="text-[10px]" />}
          </button>
          <button
            onClick={handleNewCrate}
            className="w-6 h-6 flex items-center justify-center rounded-full bg-bg-hover hover:bg-accent text-text-muted hover:text-white transition-all duration-200 border-none cursor-pointer text-xs"
            title="New Crate"
          >
            <FaPlus />
          </button>
        </div>

        <AnimatePresence>
          {cratesOpen && (
            <motion.ul
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="list-none overflow-hidden"
            >
              {crates.length === 0 ? (
                <li className="text-xs text-text-muted px-3 py-2 italic">
                  No crates yet. Click + to create one.
                </li>
              ) : (
                crates.map((crate) => (
                  <li key={crate.id}>
                    <Link
                      to={`/crates/${crate.id}`}
                      className="flex items-center gap-2 px-3 py-1.5 text-sm text-text-secondary hover:text-text-primary hover:bg-bg-hover rounded-md transition-all duration-150 no-underline"
                    >
                      <FaBoxOpen className="text-accent text-xs shrink-0" />
                      <span className="truncate">{crate.name}</span>
                      <span className="ml-auto text-xs text-text-muted">{crate.tracks.length}</span>
                    </Link>
                  </li>
                ))
              )}
            </motion.ul>
          )}
        </AnimatePresence>
      </div>
    </aside>
  );
}

export default Sidebar;
