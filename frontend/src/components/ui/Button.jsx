const VARIANTS = {
  primary: 'bg-accent text-white hover:bg-accent-hover shadow-lg shadow-accent/20',
  secondary: 'bg-bg-hover text-text-primary hover:bg-border-light',
  ghost: 'bg-transparent text-text-secondary hover:text-text-primary hover:bg-bg-hover',
  danger: 'bg-danger/15 text-danger hover:bg-danger/25',
  neon: 'bg-neon/15 text-neon hover:bg-neon/25',
};

const SIZES = {
  sm: 'h-8 px-3 text-xs gap-1.5',
  md: 'h-10 px-4 text-sm gap-2',
  lg: 'h-12 px-5 text-base gap-2',
};

export function Button({ variant = 'secondary', size = 'md', className = '', children, ...props }) {
  return (
    <button
      type="button"
      className={`inline-flex items-center justify-center rounded-lg font-medium border-none transition-colors duration-150 disabled:opacity-50 disabled:pointer-events-none ${VARIANTS[variant]} ${SIZES[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

/** Icon-only button. `label` is required: it becomes the tooltip and the accessible name. */
export function IconButton({ label, variant = 'ghost', size = 'md', active = false, className = '', children, ...props }) {
  const dims = { sm: 'w-8 h-8 text-xs', md: 'w-10 h-10 text-sm', lg: 'w-12 h-12 text-base' }[size];
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      aria-pressed={active || undefined}
      className={`inline-flex items-center justify-center rounded-full border-none transition-colors duration-150 disabled:opacity-40 disabled:pointer-events-none ${dims} ${active ? 'text-accent bg-accent/10' : VARIANTS[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
