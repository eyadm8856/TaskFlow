export default function Loader({ label = 'Loading...', size = 'md' }) {
  const sizeClass = size === 'sm' ? 'loader-sm' : size === 'lg' ? 'loader-lg' : 'loader-md';

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem 1rem',
        gap: '0.75rem',
      }}
    >
      <div
        style={{
          width: size === 'sm' ? '20px' : size === 'lg' ? '40px' : '28px',
          height: size === 'sm' ? '20px' : size === 'lg' ? '40px' : '28px',
          border: '3px solid var(--color-border)',
          borderTopColor: 'var(--color-primary)',
          borderRadius: '50%',
          animation: 'taskflow-spin 0.8s linear infinite',
        }}
      />
      <style>{`
        @keyframes taskflow-spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
      <span style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', fontWeight: 500 }}>
        {label}
      </span>
      <span className="sr-only">{label}</span>
    </div>
  );
}
