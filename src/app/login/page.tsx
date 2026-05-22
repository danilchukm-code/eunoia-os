'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const endpoint = isRegister ? '/api/auth/register' : '/api/auth/login';

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, name }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Ошибка');
        return;
      }

      // Redirect to onboarding for new users, main page for existing
      window.location.href = isRegister ? '/onboarding' : '/';
    } catch (err: any) {
      setError('Ошибка соединения');
    }

    setLoading(false);
  };

  return (
    <div
      style={{
        minHeight: '100dvh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#1a1714',
        fontFamily: "'DM Sans', sans-serif",
        color: '#e8e2d8',
        fontWeight: 300,
      }}
    >
      <div style={{ width: 360, padding: '0 24px' }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div
            style={{
              fontFamily: "'Cormorant Garamond', serif",
              fontSize: 42,
              fontWeight: 300,
              letterSpacing: '0.18em',
              color: '#e8e2d8',
              textTransform: 'uppercase',
            }}
          >
            E<span style={{ color: '#c4a96a' }}>U</span>NOIA
          </div>
          <div
            style={{
              fontSize: 11,
              letterSpacing: '0.22em',
              color: '#6a6460',
              textTransform: 'uppercase',
              marginTop: 6,
            }}
          >
            Cognitive OS
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {isRegister && (
            <input
              type="text"
              placeholder="Имя"
              value={name}
              onChange={e => setName(e.target.value)}
              style={{
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 8,
                padding: '10px 14px',
                color: '#e8e2d8',
                fontSize: 14,
                outline: 'none',
                fontFamily: "'DM Sans', sans-serif",
              }}
            />
          )}

          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            style={{
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 8,
              padding: '10px 14px',
              color: '#e8e2d8',
              fontSize: 14,
              outline: 'none',
              fontFamily: "'DM Sans', sans-serif",
            }}
          />

          <input
            type="password"
            placeholder="Пароль"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            style={{
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 8,
              padding: '10px 14px',
              color: '#e8e2d8',
              fontSize: 14,
              outline: 'none',
              fontFamily: "'DM Sans', sans-serif",
            }}
          />

          {error && (
            <div style={{ color: '#c07070', fontSize: 12, textAlign: 'center' }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              padding: '11px',
              background: 'rgba(196,169,106,0.15)',
              border: '1px solid rgba(196,169,106,0.3)',
              borderRadius: 8,
              color: '#c4a96a',
              fontSize: 13,
              fontWeight: 400,
              letterSpacing: '0.08em',
              cursor: 'pointer',
              fontFamily: "'DM Sans', sans-serif",
              opacity: loading ? 0.5 : 1,
              marginTop: 4,
            }}
          >
            {loading ? 'Загрузка...' : isRegister ? 'Создать аккаунт' : 'Войти'}
          </button>
        </form>

        {/* Toggle */}
        <div style={{ textAlign: 'center', marginTop: 20 }}>
          <button
            onClick={() => setIsRegister(!isRegister)}
            style={{
              background: 'none',
              border: 'none',
              color: '#6a6460',
              fontSize: 12,
              cursor: 'pointer',
              fontFamily: "'DM Sans', sans-serif",
              letterSpacing: '0.04em',
            }}
          >
            {isRegister ? 'Уже есть аккаунт? Войти' : 'Нет аккаунта? Создать'}
          </button>
        </div>
      </div>
    </div>
  );
}
