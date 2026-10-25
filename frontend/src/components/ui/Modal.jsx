import { useEffect, useRef } from 'react';
import { FaTimes } from 'react-icons/fa';
import { IconButton } from './Button';

/** Accessible dialog: focus moves in on open and back out on close; Esc is handled globally. */
export function Modal({ title, onClose, children, footer, width = 'max-w-md' }) {
  const panelRef = useRef(null);

  useEffect(() => {
    const previous = document.activeElement;
    const first = panelRef.current?.querySelector('input, select, textarea, button:not([data-close])');
    (first || panelRef.current)?.focus();
    return () => previous?.focus?.();
  }, []);

  return (
    <div className="fixed inset-0 z-200 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in" onMouseDown={onClose}>
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        onMouseDown={(e) => e.stopPropagation()}
        className={`w-full ${width} bg-bg-elevated border border-border rounded-2xl shadow-pop animate-slide-up outline-none`}
      >
        <div className="flex items-center justify-between px-5 pt-4 pb-2">
          <h2 className="text-base font-semibold text-text-primary">{title}</h2>
          <IconButton label="Close" size="sm" onClick={onClose} data-close>
            <FaTimes />
          </IconButton>
        </div>
        <div className="px-5 pb-4">{children}</div>
        {footer && <div className="flex justify-end gap-2 px-5 py-3 border-t border-border">{footer}</div>}
      </div>
    </div>
  );
}
