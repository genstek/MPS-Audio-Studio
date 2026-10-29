import React, { useEffect, useRef, useState } from 'react';
import { api } from './account-api.js';

const UNAVAILABLE = 'Accounts are unavailable right now. Local playback still works.';

// Account button and dialog (LAS-21). Talks to the server only when opened, or when the page was
// opened from a verification link, so local-only use makes no network requests (LAS-20).
export function AccountDialog() {
  const dialog = useRef(null);
  const [view, setView] = useState('signin');
  const [user, setUser] = useState(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  // Opened from a verification link: show progress from the first render.
  const [busy, setBusy] = useState(() => (new URLSearchParams(window.location.search).has('verify') ? 'Verifying your email…' : ''));

  function show(nextView, { note = '', problem = '' } = {}) {
    setView(nextView);
    setMessage(note);
    setError(problem);
    setPassword('');
  }

  // Following the emailed link: remove the token from the address bar first (so a second effect
  // run finds nothing and the single-use token is sent once), then verify.
  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get('verify');
    if (!token) return;
    window.history.replaceState(null, '', window.location.pathname);
    dialog.current.showModal();
    api('/auth/verify', { method: 'POST', body: { token } }).then(result => {
      setBusy('');
      setView(result.ok || result.unavailable ? 'signin' : 'resend');
      setMessage(result.ok ? 'Email verified. You can sign in now.' : '');
      setError(result.unavailable ? UNAVAILABLE : result.ok ? '' : result.data.message);
    });
  }, []);

  async function open() {
    dialog.current.showModal();
    setBusy('Checking your session…');
    const result = await api('/auth/session');
    setBusy('');
    if (result.unavailable) return show('signin', { problem: UNAVAILABLE });
    setUser(result.data.user);
    show(result.data.user ? 'account' : 'signin');
  }

  async function submit(event, path, body, onSuccess) {
    event.preventDefault();
    setBusy('Please wait…');
    setError('');
    setMessage('');
    const result = await api(path, { method: 'POST', body });
    setBusy('');
    if (result.unavailable) return setError(UNAVAILABLE);
    if (!result.ok) {
      if (result.data.error === 'unverified') return show('resend', { problem: result.data.message });
      return setError(result.data.message ?? 'Something went wrong. Try again.');
    }
    onSuccess(result.data);
  }

  const signIn = event => submit(event, '/auth/login', { email, password }, data => {
    setUser(data.user);
    show('account', { note: 'Signed in.' });
  });
  const register = event => submit(event, '/auth/register', { email, password }, data => show('check-email', { note: data.message }));
  const resend = event => submit(event, '/auth/resend-verification', { email }, data => show('check-email', { note: data.message }));

  async function signOut() {
    setBusy('Signing out…');
    const result = await api('/auth/logout', { method: 'POST' });
    setBusy('');
    if (result.unavailable) return setError(UNAVAILABLE);
    setUser(null);
    show('signin', { note: 'Signed out.' });
  }

  const titles = { signin: 'Sign in', register: 'Create account', 'check-email': 'Check your email', resend: 'Verify your email', account: 'Your account' };
  const emailField = (
    <label>Email<input type="email" autoComplete="email" required value={email} onChange={e => setEmail(e.target.value)} /></label>
  );
  const passwordField = autoComplete => (
    <label>Password<input type="password" autoComplete={autoComplete} required minLength={autoComplete === 'new-password' ? 10 : undefined} maxLength={128} value={password} onChange={e => setPassword(e.target.value)} /></label>
  );

  return (
    <>
      <button className="account-button" onClick={open}>Account</button>
      <dialog ref={dialog} className="account-dialog" aria-labelledby="account-title">
        <div className="account-heading">
          <h2 id="account-title">{titles[view]}</h2>
          <button className="dialog-close" onClick={() => dialog.current.close()} aria-label="Close account dialog">×</button>
        </div>
        <p className="account-status" role="status">{busy || message}</p>
        {error && <p className="account-error" role="alert">{error}</p>}

        {view === 'signin' && (
          <form onSubmit={signIn}>
            {emailField}
            {passwordField('current-password')}
            <button type="submit" className="primary" disabled={!!busy}>Sign in</button>
            <p className="account-links"><button type="button" className="link" onClick={() => show('register')}>Create account</button></p>
          </form>
        )}
        {view === 'register' && (
          <form onSubmit={register}>
            {emailField}
            {passwordField('new-password')}
            <p className="fine-print">10 to 128 characters. Your audio stays on this device unless you choose to save it to your private library.</p>
            <button type="submit" className="primary" disabled={!!busy}>Create account</button>
            <p className="account-links"><button type="button" className="link" onClick={() => show('signin')}>I already have an account</button></p>
          </form>
        )}
        {view === 'check-email' && (
          <div className="account-body">
            <p>Open the link in the email to verify your address, then sign in.</p>
            <button type="button" className="link" onClick={() => show('signin')}>Back to sign in</button>
          </div>
        )}
        {view === 'resend' && (
          <form onSubmit={resend}>
            {emailField}
            <button type="submit" disabled={!!busy}>Send a new verification link</button>
            <p className="account-links"><button type="button" className="link" onClick={() => show('signin')}>Back to sign in</button></p>
          </form>
        )}
        {view === 'account' && user && (
          <div className="account-body">
            <p>Signed in as <strong>{user.email}</strong></p>
            <button type="button" onClick={signOut} disabled={!!busy}>Sign out</button>
          </div>
        )}
      </dialog>
    </>
  );
}
