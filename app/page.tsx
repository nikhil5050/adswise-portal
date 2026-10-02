import './home.css';

// Plain <a> links (not next/link): each app is a full page load so its globals start clean.
const apps = [
  {
    href: '/invoice',
    icon: '₹',
    title: 'Invoice System',
    text: 'Create GST invoices, manage clients, track payments and view revenue reports.',
  },
  {
    href: '/hrms',
    icon: '✎',
    title: 'HR Document System',
    text: 'Offer letters, appointment letters, payslips and employee master records on the Adswise letterhead.',
  },
];

export default function Home() {
  return (
    <main className="portal">
      <header className="portal-head">
        <div className="portal-mark">
          Adsw<span>ise</span>
        </div>
        <p className="portal-tag">Your Growth Is Our Business</p>
      </header>

      <div className="portal-grid">
        {apps.map((a) => (
          <a key={a.href} href={a.href} className="portal-card">
            <span className="portal-icon" aria-hidden>
              {a.icon}
            </span>
            <h2>{a.title}</h2>
            <p>{a.text}</p>
            <span className="portal-open">Open →</span>
          </a>
        ))}
      </div>

      <footer className="portal-foot">
        Adswise Marketing · Pune
        <form method="post" action="/api/logout">
          <button className="portal-logout" type="submit">Sign out</button>
        </form>
      </footer>
    </main>
  );
}
