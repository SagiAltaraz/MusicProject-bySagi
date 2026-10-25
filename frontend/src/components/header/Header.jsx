import { NavLink, Link } from 'react-router-dom';
import { FaCompactDisc, FaBars, FaDownload, FaCog } from 'react-icons/fa';
import useSettingsStore, { DOWNLOAD_FORMATS } from '../../stores/settingsStore';
import useDownloadStore from '../../stores/downloadStore';
import useUiStore from '../../stores/uiStore';
import { IconButton } from '../ui/Button';
import SearchBox from './SearchBox';

const navClass = ({ isActive }) => `px-4 py-2 rounded-full text-sm font-medium no-underline transition-all duration-200 whitespace-nowrap
  ${isActive ? 'bg-accent text-white' : 'text-text-secondary hover:text-text-primary hover:bg-bg-hover'}`;

function Header() {
  const { downloadFormat, setDownloadFormat } = useSettingsStore();
  const formatHint = DOWNLOAD_FORMATS.find((f) => f.value === downloadFormat)?.hint;
  const active = useDownloadStore((s) => Object.values(s.jobs).filter((j) => j.status === 'running' || j.status === 'queued').length);
  const downloadsOpen = useUiStore((s) => s.downloadsOpen);

  return (
    <header className="flex items-center h-16 px-3 sm:px-5 gap-3 sm:gap-5 bg-bg-secondary border-b border-border shrink-0 z-50">
      <IconButton label="Toggle sidebar" onClick={() => useUiStore.getState().toggleSidebar()}>
        <FaBars />
      </IconButton>

      <Link to="/" className="hidden sm:flex items-center gap-2 no-underline shrink-0" aria-label="DJ Crate home">
        <FaCompactDisc className="text-accent text-2xl motion-safe:animate-[spin_3s_linear_infinite]" aria-hidden />
        <span className="text-xl font-bold bg-linear-to-r from-accent to-neon bg-clip-text text-transparent">DJ Crate</span>
      </Link>

      <nav className="hidden md:flex items-center gap-1" aria-label="Main">
        <NavLink to="/" end className={navClass}>Discover</NavLink>
        <NavLink to="/crates" className={navClass}>Crates</NavLink>
      </nav>

      <SearchBox />

      <label className="hidden lg:flex items-center gap-2 text-xs text-text-secondary" title={formatHint}>
        <span className="uppercase tracking-wider font-semibold">Format</span>
        <select
          value={downloadFormat}
          onChange={(e) => setDownloadFormat(e.target.value)}
          aria-label="Download format"
          className="h-10 px-3 bg-bg-input border border-border rounded-full text-sm text-text-primary outline-none transition-all duration-200 focus:border-accent"
        >
          {DOWNLOAD_FORMATS.map((f) => (
            <option key={f.value} value={f.value}>{f.label}</option>
          ))}
        </select>
      </label>

      <div className="flex items-center gap-1">
        <IconButton label={active ? `Downloads (${active} running)` : 'Downloads'} active={downloadsOpen} onClick={() => useUiStore.getState().toggleDownloads()} className="relative">
          <FaDownload />
          {active > 0 && (
            <span className="absolute top-1 right-1 min-w-4 h-4 px-1 rounded-full bg-accent text-white text-[10px] font-bold leading-4 tabular">{active}</span>
          )}
        </IconButton>
        <NavLink to="/settings" aria-label="Settings" title="Settings" className={({ isActive }) => `w-10 h-10 inline-flex items-center justify-center rounded-full transition-colors ${isActive ? 'text-accent bg-accent/10' : 'text-text-secondary hover:text-text-primary hover:bg-bg-hover'}`}>
          <FaCog />
        </NavLink>
      </div>
    </header>
  );
}

export default Header;
