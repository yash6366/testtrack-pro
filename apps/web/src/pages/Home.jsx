import { Link } from 'react-router-dom';
import ThemeToggle from '@/components/ThemeToggle';

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col">
      <header className="max-w-6xl w-full mx-auto px-6 pt-8">
        <nav className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-[var(--surface-strong)] border border-[var(--border)] flex items-center justify-center font-bold">
              TT
            </div>
            <div>
              <p className="text-sm text-[var(--muted)]">TestTrack Pro</p>
              <h1 className="text-lg font-semibold">Quality Intelligence Hub</h1>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Link
              to="/login"
              className="tt-btn tt-btn-outline px-4 py-2 text-sm"
            >
              Login
            </Link>
          </div>
        </nav>
      </header>

      <section className="flex-1 flex items-center">
        <div className="max-w-6xl w-full mx-auto px-6 py-12 grid lg:grid-cols-2 gap-10 items-center">
          <div className="space-y-6 animate-fade-up">
            <span className="tt-pill">Built for fast release cycles</span>
            <h2 className="text-4xl sm:text-5xl font-semibold leading-tight">
              Align QA, Dev, and Admin teams in one calm command center.
            </h2>
            <p className="text-base text-[var(--muted)] max-w-xl">
              TestTrack Pro keeps execution status, team chat, and system health aligned with live
              updates so releases stay predictable and measurable.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                to="/signup"
                className="tt-btn tt-btn-primary px-6 py-3 text-sm"
              >
                Create account
              </Link>
              <Link
                to="/login"
                className="tt-btn tt-btn-outline px-6 py-3 text-sm"
              >
                Sign in
              </Link>
            </div>
            <div className="flex flex-wrap items-center gap-4 text-xs text-[var(--muted)]">
              <span>Live dashboards</span>
              <span>Realtime discussions</span>
              <span>Automated test rollups</span>
            </div>
          </div>

          <div className="tt-card p-6 lg:p-8 space-y-6 animate-fade-in">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase text-[var(--muted)] tracking-[0.2em]">
                  Release snapshot
                </p>
                <h3 className="text-2xl font-semibold">Today</h3>
              </div>
              <span className="tt-pill">Stable</span>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {[
                { label: 'Active tests', value: '128' },
                { label: 'Open bugs', value: '14' },
                { label: 'Services live', value: '8' },
                { label: 'Avg response', value: '120ms' },
              ].map((item) => (
                <div key={item.label} className="tt-card-soft p-4">
                  <p className="text-xs text-[var(--muted)]">{item.label}</p>
                  <p className="text-xl font-semibold mt-2">{item.value}</p>
                </div>
              ))}
            </div>
            <div className="tt-card-soft p-4">
              <p className="text-xs text-[var(--muted)]">Release checklist</p>
              <ul className="mt-3 space-y-2 text-sm">
                <li className="flex items-center justify-between">
                  <span>Regression suites</span>
                  <span className="text-[var(--success)]">Completed</span>
                </li>
                <li className="flex items-center justify-between">
                  <span>API monitoring</span>
                  <span className="text-[var(--warning)]">In progress</span>
                </li>
                <li className="flex items-center justify-between">
                  <span>Security checks</span>
                  <span className="text-[var(--muted)]">Queued</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
