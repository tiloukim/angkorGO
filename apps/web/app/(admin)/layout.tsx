// Admin shell — sidebar nav around all /dashboard, /providers, /users, etc.
// Access is already enforced by middleware.ts (session + role='admin').
import Link from 'next/link';

const NAV = [
  { href: '/dashboard', label: 'Overview' },
  { href: '/providers', label: 'Provider Approvals' },
  { href: '/vehicles', label: 'Vehicle Approvals' },
  { href: '/rides', label: 'Ride Operations' },
  { href: '/users', label: 'Users' },
  { href: '/payouts', label: 'Payout Queue' },
  { href: '/disputes', label: 'Dispute Center' },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-white">
      <aside className="w-60 shrink-0 border-r border-black/10 bg-[#f6f6f6] p-5">
        <div className="mb-8">
          <p className="text-xl font-extrabold tracking-tight text-black">AngkorGo</p>
          <p className="text-xs font-medium text-black/45">Admin Console</p>
        </div>
        <nav className="space-y-1">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className="block rounded-lg px-3 py-2 text-sm font-medium text-black/60 hover:bg-black/5 hover:text-black"
            >
              {n.label}
            </Link>
          ))}
        </nav>
      </aside>
      <div className="flex-1 bg-white">{children}</div>
    </div>
  );
}
