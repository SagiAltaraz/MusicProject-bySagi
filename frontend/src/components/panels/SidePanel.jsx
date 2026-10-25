import { FaTimes } from 'react-icons/fa';
import { IconButton } from '../ui/Button';

/** Right-hand panel that sits between the header and the player. */
function SidePanel({ title, subtitle, onClose, actions, children, width = 'w-[min(100vw,24rem)]' }) {
  return (
    <section
      aria-label={title}
      className={`fixed right-0 top-16 bottom-20 ${width} z-60 bg-bg-secondary border-l border-border shadow-pop flex flex-col animate-slide-up`}
    >
      <div className="flex items-center gap-2 px-4 h-14 border-b border-border shrink-0">
        <div className="flex-1 min-w-0">
          <h2 className="text-sm font-semibold text-text-primary">{title}</h2>
          {subtitle && <p className="text-[11px] text-text-muted truncate">{subtitle}</p>}
        </div>
        {actions}
        <IconButton label="Close" size="sm" onClick={onClose}><FaTimes /></IconButton>
      </div>
      <div className="flex-1 overflow-y-auto">{children}</div>
    </section>
  );
}

export default SidePanel;
