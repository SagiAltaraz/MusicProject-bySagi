import { FaCheckCircle, FaExclamationTriangle, FaInfoCircle, FaTimes } from 'react-icons/fa';
import useToastStore from '../../stores/toastStore';

const ICONS = {
  success: <FaCheckCircle className="text-success" />,
  error: <FaExclamationTriangle className="text-danger" />,
  info: <FaInfoCircle className="text-neon" />,
};

function Toaster() {
  const { toasts, dismiss } = useToastStore();

  return (
    <div aria-live="polite" className="fixed bottom-24 left-1/2 -translate-x-1/2 z-300 flex flex-col items-center gap-2 w-[min(92vw,26rem)] pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          role={t.tone === 'error' ? 'alert' : 'status'}
          className="pointer-events-auto w-full flex items-start gap-3 px-4 py-3 bg-bg-elevated border border-border rounded-xl shadow-pop animate-slide-up"
        >
          <span className="mt-0.5 shrink-0">{ICONS[t.tone]}</span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-text-primary">{t.title}</p>
            {t.message && <p className="text-xs text-text-secondary mt-0.5 break-words">{t.message}</p>}
          </div>
          {t.action && (
            <button
              type="button"
              onClick={() => {
                t.action.onClick();
                dismiss(t.id);
              }}
              className="shrink-0 text-xs font-semibold text-neon hover:text-neon/80 bg-transparent border-none"
            >
              {t.action.label}
            </button>
          )}
          <button type="button" aria-label="Dismiss" onClick={() => dismiss(t.id)} className="shrink-0 text-text-muted hover:text-text-primary bg-transparent border-none">
            <FaTimes className="text-xs" />
          </button>
        </div>
      ))}
    </div>
  );
}

export default Toaster;
