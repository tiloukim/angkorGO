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
    <main className="p-5 md:p-8">
      <h1 className="mb-6 text-3xl font-extrabold tracking-tight">Users</h1>
      <div className="overflow-x-auto rounded-2xl border border-black/10">
        <table className="w-full min-w-[560px] text-sm">
          <thead className="bg-[#f6f6f6] text-left text-black/50">
            <tr>
              <th className="p-3 font-semibold">Name</th><th className="p-3 font-semibold">Phone</th>
              <th className="p-3 font-semibold">Role</th><th className="p-3 font-semibold">Status</th><th className="p-3" />
            </tr>
          </thead>
          <tbody>
            {(users ?? []).map((u) => (
              <tr key={u.id} className="border-t border-black/10">
                <td className="p-3 font-medium">{u.full_name ?? '—'}</td>
                <td className="p-3 text-black/55">{u.phone ?? '—'}</td>
                <td className="p-3 capitalize">{u.role}</td>
                <td className="p-3">
                  <span className={`font-semibold ${u.is_suspended ? 'text-danger' : 'text-brand'}`}>
                    {u.is_suspended ? 'Suspended' : 'Active'}
                  </span>
                </td>
                <td className="p-3 text-right">
                  <form action={setUserSuspended.bind(null, u.id, !u.is_suspended)}>
                    <button className="rounded-lg border border-black/15 px-3 py-1.5 text-xs font-semibold hover:border-black">
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
