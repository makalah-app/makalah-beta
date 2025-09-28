'use client'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html>
      <body>
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          fontFamily: 'system-ui, -apple-system, sans-serif'
        }}>
          <h1 style={{ fontSize: '2rem', marginBottom: '1rem' }}>Application Error</h1>
          <p style={{ color: '#666', marginBottom: '2rem' }}>A critical error occurred.</p>
          <button
            onClick={reset}
            style={{
              color: '#fff',
              backgroundColor: '#0070f3',
              border: 'none',
              borderRadius: '4px',
              padding: '0.5rem 1rem',
              cursor: 'pointer',
              fontSize: '1rem'
            }}
          >
            Reload Application
          </button>
        </div>
      </body>
    </html>
  )
}