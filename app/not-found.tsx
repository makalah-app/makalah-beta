export default function NotFound() {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      <h1 style={{ fontSize: '2rem', marginBottom: '1rem' }}>404 - Page Not Found</h1>
      <p style={{ color: '#666', marginBottom: '2rem' }}>The page you are looking for does not exist.</p>
      <a href="/" style={{
        color: '#0070f3',
        textDecoration: 'none',
        padding: '0.5rem 1rem',
        border: '1px solid #0070f3',
        borderRadius: '4px'
      }}>
        Go back home
      </a>
    </div>
  )
}