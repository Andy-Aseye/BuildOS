'use client';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: 'system-ui, sans-serif', background: '#f8fafc' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: '24px', textAlign: 'center' }}>
          <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '8px', color: '#0f172a' }}>
            Something went wrong
          </h2>
          <p style={{ fontSize: '14px', color: '#64748b', marginBottom: '24px', maxWidth: '400px' }}>
            An unexpected error occurred. Your data is safe — try refreshing the page.
          </p>
          <button
            type="button"
            onClick={reset}
            style={{ padding: '10px 20px', background: '#0f172a', color: 'white', border: 'none', borderRadius: '12px', fontSize: '14px', fontWeight: 500, cursor: 'pointer' }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
