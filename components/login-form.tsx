'use client';

import { useState } from 'react';

export default function LoginForm() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError('');

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const result = await response.json();

      if (!response.ok) throw Error(result.error || 'Login gagal.');

      const destination =
        result.home === 'printing'
          ? '/printing'
          : result.home === 'finishing'
            ? '/finishing'
            : '/';
      window.location.replace(destination);
    } catch (error) {
      setError((error as Error).message);
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit}>
      <label htmlFor="username">Username</label>
      <input
        id="username"
        name="username"
        autoComplete="username"
        autoCapitalize="none"
        spellCheck={false}
        required
        minLength={3}
        maxLength={40}
        value={username}
        onChange={(event) => setUsername(event.target.value)}
        disabled={busy}
      />

      <label htmlFor="password">Password</label>
      <input
        id="password"
        name="password"
        type="password"
        autoComplete="current-password"
        required
        minLength={5}
        maxLength={256}
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        disabled={busy}
      />

      {error && (
        <p role="alert" className="warning">
          {error}
        </p>
      )}

      <button className="primary" disabled={busy}>
        {busy ? 'Memeriksa…' : 'Masuk'}
      </button>
    </form>
  );
}
