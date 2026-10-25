import { useEffect, useRef, useState } from 'react';

/**
 * A trigger plus a floating panel that closes on outside click and Esc.
 * renderTrigger({ open, toggle, props }) must spread `props` onto the trigger button.
 */
export function Popover({ renderTrigger, children, align = 'right', side = 'bottom', className = 'w-52' }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => {
      if (!ref.current?.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey, true);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey, true);
    };
  }, [open]);

  const close = () => setOpen(false);
  const position = `${side === 'top' ? 'bottom-full mb-2' : 'top-full mt-2'} ${align === 'right' ? 'right-0' : 'left-0'}`;

  return (
    <div ref={ref} className="relative">
      {renderTrigger({ open, toggle: () => setOpen((o) => !o), props: { 'aria-expanded': open, 'aria-haspopup': 'menu' } })}
      {open && (
        <div role="menu" className={`absolute ${position} z-150 ${className} bg-bg-elevated border border-border rounded-xl shadow-pop py-1 animate-slide-up`}>
          {typeof children === 'function' ? children(close) : children}
        </div>
      )}
    </div>
  );
}

export function MenuItem({ icon, children, onClick, danger = false, disabled = false, hint }) {
  return (
    <button
      type="button"
      role="menuitem"
      disabled={disabled}
      onClick={onClick}
      className={`w-full flex items-center gap-2.5 text-left px-3 py-2 text-sm bg-transparent border-none transition-colors disabled:opacity-40
        ${danger ? 'text-danger hover:bg-danger/10' : 'text-text-secondary hover:text-text-primary hover:bg-bg-hover'}`}
    >
      {icon && <span className="w-4 shrink-0 flex justify-center text-xs">{icon}</span>}
      <span className="flex-1 min-w-0">
        <span className="block truncate">{children}</span>
        {hint && <span className="block text-[11px] text-text-muted truncate">{hint}</span>}
      </span>
    </button>
  );
}

export function MenuLabel({ children }) {
  return <div className="px-3 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-text-muted">{children}</div>;
}
