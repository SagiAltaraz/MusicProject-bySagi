import { useEffect, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { FaSearch, FaTimes, FaHistory } from 'react-icons/fa';
import useSearchStore from '../../stores/searchStore';

/** Search with YouTube autocomplete, recent searches and full keyboard support. Focus with / or ⌘K. */
function SearchBox() {
  const { search, suggest, suggestions, clearSuggestions, searchHistory, removeFromHistory, isLoading, query } = useSearchStore();
  const [input, setInput] = useState(query);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const inputRef = useRef(null);
  const wrapRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();

  // Keep the box in sync when a search starts elsewhere (genres, chat, quick picks)
  useEffect(() => setInput(query), [query]);

  useEffect(() => {
    const onKey = (e) => {
      const typing = ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName);
      if ((e.key === '/' && !typing) || (e.key.toLowerCase() === 'k' && (e.metaKey || e.ctrlKey))) {
        e.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
      }
    };
    const onDown = (e) => {
      if (!wrapRef.current?.contains(e.target)) setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onDown);
    return () => {
      window.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onDown);
    };
  }, []);

  const showHistory = !input.trim();
  const items = showHistory ? searchHistory.slice(0, 8) : suggestions;

  const run = (text) => {
    const q = text.trim();
    if (!q) return;
    setInput(q);
    setOpen(false);
    setActive(-1);
    clearSuggestions();
    search(q);
    if (location.pathname !== '/') navigate('/');
    inputRef.current?.blur();
  };

  const onKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setOpen(true);
      setActive((i) => Math.min(items.length - 1, i + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((i) => Math.max(-1, i - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      run(active >= 0 && items[active] ? items[active] : input);
    } else if (e.key === 'Escape') {
      e.stopPropagation();
      if (open) setOpen(false);
      else inputRef.current?.blur();
    }
  };

  return (
    <div ref={wrapRef} className="relative flex-1 max-w-2xl min-w-0">
      <form role="search" onSubmit={(e) => { e.preventDefault(); run(input); }}>
        <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted text-sm pointer-events-none" aria-hidden />
        <input
          ref={inputRef}
          value={input}
          onChange={(e) => {
            setInput(e.target.value);
            setOpen(true);
            setActive(-1);
            suggest(e.target.value);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          role="combobox"
          aria-expanded={open && items.length > 0}
          aria-controls="search-suggestions"
          aria-activedescendant={active >= 0 ? `suggestion-${active}` : undefined}
          aria-label="Search tracks"
          className="w-full h-10 pl-11 pr-20 bg-bg-input border border-border rounded-full text-sm text-text-primary placeholder:text-text-muted outline-none transition-all duration-200 focus:border-accent focus:shadow-[0_0_0_3px_var(--color-accent-glow)]"
          type="text"
          placeholder="Search tracks, artists, remixes…"
          autoComplete="off"
          spellCheck="false"
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
          {isLoading && <span className="w-4 h-4 border-2 border-accent border-t-transparent rounded-full animate-spin" aria-label="Searching" />}
          {input ? (
            <button type="button" aria-label="Clear search" onClick={() => { setInput(''); clearSuggestions(); inputRef.current?.focus(); }} className="text-text-muted hover:text-text-primary bg-transparent border-none p-1">
              <FaTimes className="text-xs" />
            </button>
          ) : (
            <kbd className="hidden md:inline text-[10px] text-text-muted border border-border rounded px-1.5 py-0.5">/</kbd>
          )}
        </div>
      </form>

      {open && items.length > 0 && (
        <ul id="search-suggestions" role="listbox" className="absolute top-full mt-2 left-0 right-0 z-150 bg-bg-elevated border border-border rounded-xl shadow-pop py-1 animate-slide-up">
          {showHistory && <li className="px-4 pt-1.5 pb-1 text-[10px] font-semibold uppercase tracking-wider text-text-muted">Recent</li>}
          {items.map((item, i) => (
            <li
              key={item}
              id={`suggestion-${i}`}
              role="option"
              aria-selected={i === active}
              onMouseDown={(e) => { e.preventDefault(); run(item); }}
              onMouseEnter={() => setActive(i)}
              className={`group flex items-center gap-3 px-4 py-2 text-sm cursor-pointer ${i === active ? 'bg-bg-hover text-text-primary' : 'text-text-secondary'}`}
            >
              {showHistory ? <FaHistory className="text-text-muted text-xs" aria-hidden /> : <FaSearch className="text-text-muted text-xs" aria-hidden />}
              <span className="flex-1 truncate">{item}</span>
              {showHistory && (
                <button
                  type="button"
                  aria-label={`Remove ${item} from history`}
                  onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); removeFromHistory(item); }}
                  className="opacity-0 group-hover:opacity-100 text-text-muted hover:text-danger bg-transparent border-none p-1"
                >
                  <FaTimes className="text-[10px]" />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default SearchBox;
