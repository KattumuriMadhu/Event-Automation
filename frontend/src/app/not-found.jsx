"use client";

import { useRouter } from "next/navigation";

export default function NotFound() {
    const router = useRouter();

    return (
        <div style={{
            height: '100vh',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            background: '#f8fafc',
            color: '#0f172a',
            textAlign: 'center'
        }}>
            <h1 style={{ fontSize: '4rem', marginBottom: '1rem' }}>404</h1>
            <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>Oops! You might have missed something.</h2>
            <p style={{ color: '#64748b', marginBottom: '2rem' }}>The page you are looking for does not exist.</p>

            <button
                onClick={() => router.push('/dashboard')}
                style={{
                    padding: '12px 24px',
                    background: '#2563eb',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '1rem',
                    cursor: 'pointer',
                    fontWeight: '600',
                    transition: 'background 0.2s'
                }}
                onMouseOver={(e) => e.target.style.background = '#1d4ed8'}
                onMouseOut={(e) => e.target.style.background = '#2563eb'}
            >
                Go to Dashboard
            </button>
        </div>
    );
}
