export default function EmptyState({
  icon = '📂',
  title = 'No items found',
  description = 'There are no items to display at this moment.',
  action = null,
}) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        padding: '3rem 1.5rem',
        backgroundColor: 'var(--color-surface)',
        border: '1px dashed var(--color-border)',
        borderRadius: 'var(--radius-lg)',
        maxWidth: '520px',
        margin: '1.5rem auto',
      }}
    >
      <div
        aria-hidden="true"
        style={{
          fontSize: '2.5rem',
          marginBottom: '0.75rem',
          lineHeight: 1,
        }}
      >
        {icon}
      </div>
      <h3
        style={{
          fontSize: '1.125rem',
          fontWeight: 700,
          color: 'var(--color-text-primary)',
          marginBottom: '0.375rem',
        }}
      >
        {title}
      </h3>
      <p
        style={{
          fontSize: '0.875rem',
          color: 'var(--color-text-secondary)',
          maxWidth: '400px',
          marginBottom: action ? '1.25rem' : 0,
          lineHeight: 1.5,
        }}
      >
        {description}
      </p>
      {action && <div>{action}</div>}
    </div>
  );
}
