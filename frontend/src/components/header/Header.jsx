import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { FaSearch, FaCompactDisc } from 'react-icons/fa';
import useSearchStore from '../../stores/searchStore';
import useSettingsStore, { DOWNLOAD_FORMATS } from '../../stores/settingsStore';

function Header() {
  const [input, setInput] = useState('');
  const { search, isLoading } = useSearchStore();
  const { downloadFormat, setDownloadFormat } = useSettingsStore();
  const formatHint = DOWNLOAD_FORMATS.find((f) => f.value === downloadFormat)?.hint;
  const location = useLocation();

  const handleSearch = (e) => {
    e.preventDefault();
    if (!input.trim()) return;
    search(input.trim());
  };

  return (
    <header className="flex items-center h-16 px-5 bg-bg-secondary border-b border-border shrink-0 z-50">
      {/* Logo */}
      <Link to="/" className="flex items-center gap-2 no-underline mr-6">
        <FaCompactDisc className="text-accent text-2xl animate-[spin_3s_linear_infinite]" />
        <span className="text-xl font-bold bg-linear-to-r from-accent to-neon bg-clip-text text-transparent">
          DJ Crate
        </span>
      </Link>

      {/* Navigation */}
      <nav className="flex items-center gap-1 mr-6">
        <Link
          to="/"
          className={`px-4 py-2 rounded-full text-sm font-medium no-underline transition-all duration-200
            ${location.pathname === '/'
              ? 'bg-accent text-white'
              : 'text-text-secondary hover:text-text-primary hover:bg-bg-hover'
            }`}
        >
          Discover
        </Link>
        <Link
          to="/crates"
          className={`px-4 py-2 rounded-full text-sm font-medium no-underline transition-all duration-200
            ${location.pathname.startsWith('/crates')
              ? 'bg-accent text-white'
              : 'text-text-secondary hover:text-text-primary hover:bg-bg-hover'
            }`}
        >
          Crates
        </Link>
      </nav>

      {/* Search */}
      <form onSubmit={handleSearch} className="flex-1 max-w-2xl relative">
        <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted text-sm" />
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="w-full pl-11 pr-4 py-2.5 bg-bg-input border border-border rounded-full text-sm text-text-primary placeholder:text-text-muted outline-none transition-all duration-200 focus:border-accent focus:shadow-[0_0_0_2px_var(--color-accent-glow)]"
          type="text"
          placeholder="Search tracks, artists, genres..."
        />
        {isLoading && (
          <div className="absolute right-4 top-1/2 -translate-y-1/2">
            <div className="w-4 h-4 border-2 border-accent border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </form>

      {/* Download format */}
      <label className="flex items-center gap-2 ml-6 text-xs text-text-secondary" title={formatHint}>
        <span className="uppercase tracking-wider font-semibold">Format</span>
        <select
          value={downloadFormat}
          onChange={(e) => setDownloadFormat(e.target.value)}
          aria-label="Download format"
          className="px-3 py-2 bg-bg-input border border-border rounded-full text-sm text-text-primary outline-none cursor-pointer transition-all duration-200 focus:border-accent"
        >
          {DOWNLOAD_FORMATS.map((f) => (
            <option key={f.value} value={f.value}>{f.label}</option>
          ))}
        </select>
      </label>

      {/* User avatar */}
      <div className="flex items-center gap-3 ml-4">
        <div className="w-8 h-8 rounded-full bg-linear-to-br from-accent to-neon flex items-center justify-center text-sm font-bold text-white">
          S
        </div>
      </div>
    </header>
  );
}

export default Header;
