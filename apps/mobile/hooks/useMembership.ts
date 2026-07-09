// Current user's AngkorGo membership status (gates the Emergency SOS feature).
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export function useMembership() {
  const [membershipUntil, setMembershipUntil] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setMembershipUntil(null); setLoading(false); return; }
    const { data } = await supabase.from('profiles').select('membership_until').eq('id', user.id).maybeSingle();
    setMembershipUntil((data?.membership_until as string | null) ?? null);
    setLoading(false);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const isMember = !!membershipUntil && new Date(membershipUntil).getTime() > Date.now();
  return { isMember, membershipUntil, loading, refresh };
}
