import React, { useCallback, useEffect, useRef, useState } from 'react';
import { api } from './account-api.js';
import { LibraryPanel } from './LibraryPanel.jsx';

const UNAVAILABLE = 'Accounts are unavailable right now. Local playback still works.';

const SESSION_ENDED = 'Your session has ended. Sign in again.';

// Emailed links carry their token in the URL fragment (#verify=… or #reset=…): a fragment never
// reaches a server, a proxy or their logs (LAS-25). It is removed from the address bar on use.
const linkTokens = () => new URLSearchParams(window.location.hash.slice(1));
const clearLinkTokens = () => window.history.replaceState(null, '', window.location.pathname + window.location.search);

// Account button and dialog (LAS-21/22). Talks to the server only when opened, or when the page
// was opened from an emailed link, so local-only use makes no network requests (LAS-20).
export function AccountDialog({ currentFile }) {
  const dialog = useRef(null);
  // A reset link's token is kept in memory only; the address bar is cleaned on mount.
  const [resetToken, setResetToken] = useState(() => linkTokens().get('reset'));
  const [view, setView] = useState(() => (linkTokens().get('reset') ? 'reset' : 'signin'));
  const [user, setUser] = useState(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  // Opened from a verification link: show progress from the first render.
  const [busy, setBusy] = useState(() => (linkTokens().has('verify') ? 'Verifying your email…' : ''));

  function show(nextView, { note = '', problem = '' } = {}) {
    setView(nextView);
    setMessage(note);
    setError(problem);
    setPassword('');
  }

  // Following an emailed link. The token is removed from the address bar before anything else, so
  // a second effect run finds nothing and the single-use token is sent once.
  useEffect(() => {
    const openDialog = () => { if (!dialog.current.open) dialog.current.showModal(); };
    function verify(token) {
      openDialog();
      api('/auth/verify', { method: 'POST', body: { token } }).then(result => {
        setBusy('');
        setView(result.ok || result.unavailable ? 'signin' : 'resend');
        setMessage(result.ok ? 'Email verified. You can sign in now.' : '');
        setError(result.unavailable ? UNAVAILABLE : result.ok ? '' : result.data.message);
      });
    }
    // A link opened in a new tab: the initial state above already reflects it.
    const initial = linkTokens();
    if (initial.get('reset') || initial.get('verify')) clearLinkTokens();
    if (initial.get('reset')) openDialog();
    if (initial.get('verify')) verify(initial.get('verify'));
    // A link opened in a tab where the studio is already running.
    function followLink() {
      const tokens = linkTokens();
      const reset = tokens.get('reset');
      const token = tokens.get('verify');
      if (!reset && !token) return;
      clearLinkTokens();
      if (reset) {
        setResetToken(reset);
        setView('reset');
        setMessage('');
        setError('');
        setPassword('');
        openDialog();
      }
      if (token) {
        setBusy('Verifying your email…');
        verify(token);
      }
    }
    window.addEventListener('hashchange', followLink);
    return () => window.removeEventListener('hashchange', followLink);
  }, []);

  async function open() {
    dialog.current.showModal();
    setBusy('Checking your session…');
    const result = await api('/auth/session');
    setBusy('');
    if (result.unavailable) return show('signin', { problem: UNAVAILABLE });
    // Signed in earlier on this page but the server no longer knows the session: say so.
    const ended = user && !result.data.user;
    setUser(result.data.user);
    show(result.data.user ? 'account' : 'signin', { problem: ended ? SESSION_ENDED : '' });
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
  const recover = event => submit(event, '/auth/recover', { email }, data => show('check-email', { note: data.message }));
  const reset = event => submit(event, '/auth/reset', { token: resetToken, password }, data => show('signin', { note: data.message }));

  // A protected call was refused: the server no longer accepts this session.
  const sessionEnded = useCallback(() => {
    setUser(null);
    setView('signin');
    setMessage('');
    setError(SESSION_ENDED);
  }, []);

  const [deleting, setDeleting] = useState(false);
  async function deleteAccount(event) {
    event.preventDefault();
    setBusy('Deleting your account…');
    setError('');
    const result = await api('/account', { method: 'DELETE', body: { password } });
    setBusy('');
    setDeleting(false);
    if (result.unavailable) return setError(UNAVAILABLE);
    if (result.status === 401) return sessionEnded();
    if (!result.ok) return setError(result.data.message ?? 'Something went wrong. Nothing was deleted.');
    setUser(null);
    show('signin', { note: 'Your account, your library and all saved files were deleted from the studio server.' });
  }

  async function signOut() {
    setBusy('Signing out…');
    const result = await api('/auth/logout', { method: 'POST' });
    setBusy('');
    if (result.unavailable) return setError(UNAVAILABLE);
    setUser(null);
    show('signin', { note: 'Signed out.' });
  }

  const titles = {
    signin: 'Sign in', register: 'Create account', 'check-email': 'Check your email', resend: 'Verify your email',
    recover: 'Reset your password', reset: 'Choose a new password', account: 'Your account',
  };
  const emailField = (
    <label>Email<input type="email" autoComplete="email" required value={email} onChange={e => setEmail(e.target.value)} /></label>
  );
  const passwordField = (autoComplete, label = 'Password') => (
    <label>{label}<input type="password" autoComplete={autoComplete} required minLength={autoComplete === 'new-password' ? 10 : undefined} maxLength={128} value={password} onChange={e => setPassword(e.target.value)} /></label>
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
            <p className="account-links">
              <button type="button" className="link" onClick={() => show('register')}>Create account</button>
              <button type="button" className="link" onClick={() => show('recover')}>Forgot password?</button>
            </p>
          </form>
        )}
        {view === 'recover' && (
          <form onSubmit={recover}>
            {emailField}
            <button type="submit" disabled={!!busy}>Send reset link</button>
            <p className="account-links"><button type="button" className="link" onClick={() => show('signin')}>Back to sign in</button></p>
          </form>
        )}
        {view === 'reset' && (
          <form onSubmit={reset}>
            {passwordField('new-password', 'New password')}
            <p className="fine-print">10 to 128 characters. Changing it signs you out on every device.</p>
            <button type="submit" className="primary" disabled={!!busy}>Set new password</button>
            <p className="account-links"><button type="button" className="link" onClick={() => show('recover')}>Request a new reset link</button></p>
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
            <LibraryPanel currentFile={currentFile} onSessionEnded={sessionEnded} />
            <section className="danger-zone" aria-labelledby="delete-account-title">
              <h3 id="delete-account-title">Delete account</h3>
              <p className="fine-print">Deletes your account, private library and every saved file from the studio server right away. Files on your computer are not touched. This cannot be undone.</p>
              {deleting ? (
                <form onSubmit={deleteAccount}>
                  {passwordField('current-password', 'Password to confirm')}
                  <div className="library-actions">
                    <button type="submit" className="danger" disabled={!!busy}>Delete my account</button>
                    <button type="button" onClick={() => setDeleting(false)}>Keep my account</button>
                  </div>
                </form>
              ) : <button type="button" onClick={() => setDeleting(true)}>Delete account…</button>}
            </section>
          </div>
        )}
      </dialog>
    </>
  );
}
