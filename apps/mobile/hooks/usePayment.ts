// Live payment record for a request (customer + provider both watch it).
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { Payment } from '@angkorgo/shared';

export function usePayment(requestId: string | undefined) {
  const [payment, setPayment] = useState<Payment | null>(null);

  useEffect(() => {
    if (!requestId) return;
    const load = () =>
      supabase.from('payments').select('*').eq('request_id', requestId).maybeSingle()
        .then(({ data }) => setPayment(data as Payment | null));
    load();

    const channel = supabase
      .channel(`payment:${requestId}`)
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'payments', filter: `request_id=eq.${requestId}` },
        load)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [requestId]);

  return payment;
}
