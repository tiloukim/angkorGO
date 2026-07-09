// Admin shell — sidebar nav around all /dashboard, /providers, /users, etc.
// Access is already enforced by middleware.ts (session + role='admin').
import Link from 'next/link';

const NAV = [
  { href: '/dashboard', label: 'Overview' },
  { href: '/alerts', label: '🚨 Active Alerts' },
  { href: '/providers', label: 'Provider Approvals' },
  { href: '/vehicles', label: 'Vehicle Approvals' },
  { href: '/rides', label: 'Ride Operations' },
  { href: '/users', label: 'Users' },
  { href: '/payouts', label: 'Payout Queue' },
  { href: '/disputes', label: 'Dispute Center' },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-white md:flex-row">
      <aside className="shrink-0 border-b border-black/10 bg-[#f6f6f6] p-4 md:w-60 md:border-b-0 md:border-r md:p-5">
        <div className="mb-4 md:mb-8">
          <p className="text-xl font-extrabold tracking-tight text-black">AngkorGo</p>
          <p className="text-xs font-medium text-black/45">Admin Console</p>
        </div>
        {/* Horizontal scroll nav on mobile, vertical list on desktop. */}
        <nav className="-mx-1 flex gap-1 overflow-x-auto px-1 md:mx-0 md:flex-col md:space-y-1 md:overflow-visible md:px-0">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className="whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium text-black/60 hover:bg-black/5 hover:text-black md:block"
            >
              {n.label}
            </Link>
          ))}
        </nav>
      </aside>
      <div className="min-w-0 flex-1 bg-white">{children}</div>
    </div>
  );
}
