// Admin shell — sidebar nav around all /dashboard, /providers, /users, etc.
// Access is already enforced by middleware.ts (session + role='admin').
import Link from 'next/link';

const NAV = [
  { href: '/dashboard', label: 'Overview' },
  { href: '/providers', label: 'Provider Approvals' },
  { href: '/vehicles', label: 'Vehicle Approvals' },
  { href: '/users', label: 'Users' },
  { href: '/payouts', label: 'Payout Queue' },
  { href: '/disputes', label: 'Dispute Center' },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <aside className="w-60 shrink-0 border-r border-[#1F2A40] bg-[#0B1220] p-5">
        <div className="mb-8">
          <p className="text-lg font-extrabold text-white">AngkorGo</p>
          <p className="text-xs text-[#8FA3BF]">Admin Console</p>
        </div>
        <nav className="space-y-1">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className="block rounded-lg px-3 py-2 text-sm text-[#8FA3BF] hover:bg-[#151E30] hover:text-white"
            >
              {n.label}
            </Link>
          ))}
        </nav>
      </aside>
      <div className="flex-1 bg-[#0B1220]">{children}</div>
    </div>
  );
}
