import type { Metadata } from 'next';
import '../home.css';
import './login.css';

export const metadata: Metadata = { title: 'Sign in · Adswise Portal' };

export default async function Login({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const { next = '/', error } = await searchParams;
  return (
    <main className="login">
      <form className="login-card" method="post" action="/api/login">
        <div className="portal-mark">Ads<span>wise</span></div>
        <p className="login-sub">Enter the team password to continue</p>
        <input type="hidden" name="next" value={next} />
        <input
          className="login-input"
          type="password"
          name="password"
          placeholder="Password"
          autoComplete="current-password"
          autoFocus
          required
        />
        {error && <p className="login-error">Incorrect password. Try again.</p>}
        <button className="login-btn" type="submit">Sign in</button>
      </form>
    </main>
  );
}
