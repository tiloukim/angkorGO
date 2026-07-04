// Provider approval queue — review uploaded documents, then approve or reject.
import { createClient } from '@/lib/supabase-server';
import { approveProvider, rejectProvider } from '../actions';

export default async function ProvidersPage() {
  const supabase = await createClient();

  const { data: providers } = await supabase
    .from('providers')
    .select('id, business_name, status, created_at, user_id, profiles(full_name, phone), provider_documents(type, file_url), provider_services(category)')
    .eq('status', 'pending')
    .order('created_at', { ascending: true });

  // Sign each document path so the reviewer can open it.
  const signed: Record<string, string> = {};
  for (const p of providers ?? []) {
    for (const d of (p as any).provider_documents ?? []) {
      const { data } = await supabase.storage.from('provider-docs').createSignedUrl(d.file_url, 3600);
      if (data?.signedUrl) signed[d.file_url] = data.signedUrl;
    }
  }

  return (
    <main className="p-8">
      <h1 className="mb-6 text-2xl font-bold text-white">Provider Approvals</h1>

      {!providers?.length && <p className="text-[#8FA3BF]">No providers awaiting review. 🎉</p>}

      <div className="space-y-4">
        {(providers ?? []).map((p: any) => (
          <div key={p.id} className="rounded-xl border border-[#1F2A40] bg-[#151E30] p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-lg font-bold text-white">{p.business_name ?? p.profiles?.full_name ?? 'Unnamed'}</p>
                <p className="text-sm text-[#8FA3BF]">{p.profiles?.full_name} · {p.profiles?.phone ?? 'no phone'}</p>
                <p className="mt-2 text-xs text-[#8FA3BF]">
                  Services: {(p.provider_services ?? []).map((s: any) => s.category).join(', ') || 'none selected'}
                </p>
              </div>
              <div className="flex gap-2">
                <form action={approveProvider.bind(null, p.id)}>
                  <button className="rounded-lg bg-[#10B981] px-4 py-2 text-sm font-semibold text-white">Approve</button>
                </form>
                <form action={rejectProvider.bind(null, p.id)}>
                  <button className="rounded-lg bg-[#F04438] px-4 py-2 text-sm font-semibold text-white">Reject</button>
                </form>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {(p.provider_documents ?? []).length === 0 && (
                <span className="text-xs text-[#C79A5B]">⚠ No documents uploaded</span>
              )}
              {(p.provider_documents ?? []).map((d: any) => (
                <a
                  key={d.file_url}
                  href={signed[d.file_url] ?? '#'}
                  target="_blank"
                  className="rounded-lg border border-[#1F2A40] bg-[#0B1220] px-3 py-1.5 text-xs text-white hover:border-[#F04438]"
                >
                  {d.type.replace('_', ' ')} ↗
                </a>
              ))}
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
