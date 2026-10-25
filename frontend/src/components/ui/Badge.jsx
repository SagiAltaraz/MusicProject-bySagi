import { camelotColor, GRADE_INFO } from '../../lib/format';

const TONES = {
  neutral: 'bg-bg-hover text-text-secondary',
  accent: 'bg-accent/15 text-accent',
  neon: 'bg-neon/15 text-neon',
  success: 'bg-success/15 text-success',
  warning: 'bg-warning/15 text-warning',
  danger: 'bg-danger/15 text-danger',
  muted: 'bg-bg-hover text-text-muted',
};

export function Badge({ tone = 'neutral', className = '', children, ...props }) {
  return (
    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[11px] font-semibold leading-none tabular whitespace-nowrap ${TONES[tone]} ${className}`} {...props}>
      {children}
    </span>
  );
}

/** Camelot key coloured like the wheel, with the musical key in the tooltip. */
export function KeyBadge({ camelot, keyName, confidence }) {
  if (!camelot) return <span className="text-text-muted text-xs">—</span>;
  const color = camelotColor(camelot);
  const unsure = confidence !== undefined && confidence !== null && confidence < 0.25;
  return (
    <span
      title={`${keyName || ''}${unsure ? ' (low confidence)' : ''}`}
      className="inline-flex items-center justify-center min-w-9 px-1.5 py-0.5 rounded-md text-[11px] font-bold tabular"
      style={{ color, backgroundColor: `color-mix(in srgb, ${color} 18%, transparent)` }}
    >
      {camelot}{unsure ? '?' : ''}
    </span>
  );
}

export function QualityBadge({ grade }) {
  if (!grade) return null;
  const info = GRADE_INFO[grade] || GRADE_INFO.unknown;
  return <Badge tone={info.tone} title={info.text}>{info.label}</Badge>;
}
