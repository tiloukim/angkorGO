// User management — list accounts, suspend / reinstate.
import { createClient } from '@/lib/supabase-server';
import { setUserSuspended } from '../actions';

export default async function UsersPage() {
  const supabase = await createClient();
  const { data: users } = await supabase
    .from('profiles')
    .select('id, full_name, phone, role, is_suspended, created_at')
    .order('created_at', { ascending: false })
    .limit(200);

  return (
    <main className="p-8">
      <h1 className="mb-6 text-2xl font-bold text-white">Users</h1>
      <div className="overflow-hidden rounded-xl border border-[#1F2A40]">
        <table className="w-full text-sm">
          <thead className="bg-[#151E30] text-left text-[#8FA3BF]">
            <tr>
              <th className="p-3">Name</th><th className="p-3">Phone</th>
              <th className="p-3">Role</th><th className="p-3">Status</th><th className="p-3" />
            </tr>
          </thead>
          <tbody>
            {(users ?? []).map((u) => (
              <tr key={u.id} className="border-t border-[#1F2A40] text-white">
                <td className="p-3">{u.full_name ?? '—'}</td>
                <td className="p-3 text-[#8FA3BF]">{u.phone ?? '—'}</td>
                <td className="p-3 capitalize">{u.role}</td>
                <td className="p-3">
                  <span className={u.is_suspended ? 'text-[#F04438]' : 'text-[#10B981]'}>
                    {u.is_suspended ? 'Suspended' : 'Active'}
                  </span>
                </td>
                <td className="p-3 text-right">
                  <form action={setUserSuspended.bind(null, u.id, !u.is_suspended)}>
                    <button className="rounded-lg border border-[#1F2A40] px-3 py-1.5 text-xs text-white hover:border-[#F04438]">
                      {u.is_suspended ? 'Reinstate' : 'Suspend'}
                    </button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
