import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { FaPlus, FaBoxOpen, FaChevronDown, FaChevronRight, FaCompass, FaCog } from 'react-icons/fa';
import { motion, AnimatePresence } from 'framer-motion';
import useSearchStore from '../../stores/searchStore';
import useCrateStore from '../../stores/crateStore';
import useUiStore from '../../stores/uiStore';
import { toast } from '../../stores/toastStore';
import { TRACK_MIME } from '../../hooks/useTrackActions';

const GENRES = [
  'Afro House', 'Amapiano', 'Acid House', 'Bass House', 'Breakbeat', 'Deep House', 'Disco',
  'Drum and Bass', 'Dubstep', 'Electro', 'Hard Techno', 'Hardstyle', 'Hip Hop', 'House',
  'Indie Dance', 'Jungle', 'Melodic Techno', 'Minimal', 'Nu Disco', 'Progressive House',
  'Psytrance', 'Tech House', 'Techno', 'Trance', 'UK Garage',
];

function Section({ title, open, onToggle, action, children }) {
  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-2">
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={open}
          className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-text-muted hover:text-text-primary transition-colors bg-transparent border-none"
        >
          {open ? <FaChevronDown className="text-[9px]" /> : <FaChevronRight className="text-[9px]" />}
          {title}
        </button>
        {action}
      </div>
      <AnimatePresence initial={false}>
        {open && (
          <motion.ul
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="list-none overflow-hidden"
          >
            {children}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}

/** A crate link that also accepts dropped tracks. */
function CrateLink({ crate }) {
  const [over, setOver] = useState(false);
  const addTrack = useCrateStore((s) => s.addTrack);

  return (
    <li>
      <NavLink
        to={`/crates/${crate.id}`}
        onDragOver={(e) => {
          if (e.dataTransfer.types.includes(TRACK_MIME)) {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'copy';
            setOver(true);
          }
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setOver(false);
          try {
            const track = JSON.parse(e.dataTransfer.getData(TRACK_MIME));
            const added = addTrack(crate.id, track);
            toast({ tone: added ? 'success' : 'info', title: added ? `Added to ${crate.name}` : `Already in ${crate.name}`, duration: 2500 });
          } catch {
            // Not a track drop
          }
        }}
        className={({ isActive }) => `flex items-center gap-2 px-3 py-1.5 text-sm rounded-md transition-all duration-150 no-underline
          ${over ? 'bg-neon/15 text-neon ring-1 ring-neon' : isActive ? 'bg-bg-hover text-text-primary' : 'text-text-secondary hover:text-text-primary hover:bg-bg-hover'}`}
      >
        <FaBoxOpen className="text-accent text-xs shrink-0" aria-hidden />
        <span className="truncate">{crate.name}</span>
        <span className="ml-auto text-xs text-text-muted tabular">{crate.tracks.length}</span>
      </NavLink>
    </li>
  );
}

function Sidebar() {
  const [genresOpen, setGenresOpen] = useState(true);
  const [cratesOpen, setCratesOpen] = useState(true);
  const search = useSearchStore((s) => s.search);
  const crates = useCrateStore((s) => s.crates);
  const { sidebarOpen, setSidebar, openModal } = useUiStore();
  const navigate = useNavigate();

  const closeOnSmall = () => {
    if (window.innerWidth < 1024) setSidebar(false);
  };

  return (
    <>
      {/* Overlay on small screens */}
      {sidebarOpen && <div className="lg:hidden fixed inset-0 top-16 bottom-20 bg-black/50 z-40" onClick={() => setSidebar(false)} aria-hidden />}
      <aside
        aria-label="Library"
        className={`w-60 shrink-0 bg-bg-secondary border-r border-border overflow-y-auto z-45
          max-lg:fixed max-lg:top-16 max-lg:bottom-20 max-lg:left-0 max-lg:shadow-pop transition-transform duration-200
          ${sidebarOpen ? 'max-lg:translate-x-0' : 'max-lg:-translate-x-full lg:hidden'}`}
      >
        <nav className="md:hidden p-4 pb-0 space-y-1" aria-label="Main">
          <NavLink to="/" end onClick={closeOnSmall} className="flex items-center gap-2 px-3 py-2 text-sm text-text-secondary rounded-md hover:bg-bg-hover no-underline"><FaCompass /> Discover</NavLink>
          <NavLink to="/crates" onClick={closeOnSmall} className="flex items-center gap-2 px-3 py-2 text-sm text-text-secondary rounded-md hover:bg-bg-hover no-underline"><FaBoxOpen /> Crates</NavLink>
          <NavLink to="/settings" onClick={closeOnSmall} className="flex items-center gap-2 px-3 py-2 text-sm text-text-secondary rounded-md hover:bg-bg-hover no-underline"><FaCog /> Settings</NavLink>
        </nav>

        <Section
          title="Crates"
          open={cratesOpen}
          onToggle={() => setCratesOpen(!cratesOpen)}
          action={(
            <button
              type="button"
              onClick={() => openModal({ type: 'createCrate' })}
              aria-label="New crate"
              title="New crate"
              className="w-6 h-6 flex items-center justify-center rounded-full bg-bg-hover hover:bg-accent text-text-muted hover:text-white transition-all duration-200 border-none text-[10px]"
            >
              <FaPlus />
            </button>
          )}
        >
          {crates.length === 0 ? (
            <li className="text-xs text-text-muted px-3 py-2 leading-relaxed">
              No crates yet. Create one, then drag tracks onto it.
            </li>
          ) : crates.map((crate) => <CrateLink key={crate.id} crate={crate} />)}
        </Section>

        <div className="h-px bg-border mx-4" />

        <Section title="Genres" open={genresOpen} onToggle={() => setGenresOpen(!genresOpen)}>
          {GENRES.map((genre) => (
            <li key={genre}>
              <button
                type="button"
                onClick={() => {
                  // Steer toward single tracks rather than hour-long mixes
                  search(`${genre} extended mix 2025`);
                  navigate('/');
                  closeOnSmall();
                }}
                className="w-full text-left px-3 py-1.5 text-sm text-text-secondary hover:text-text-primary hover:bg-bg-hover rounded-md transition-all duration-150 bg-transparent border-none"
              >
                {genre}
              </button>
            </li>
          ))}
        </Section>
      </aside>
    </>
  );
}

export default Sidebar;
