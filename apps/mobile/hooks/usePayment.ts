// Live payment record for a request or a trip (both sides watch it).
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { Payment } from '@angkorgo/shared';

function usePaymentBy(column: 'request_id' | 'trip_id' | 'booking_id' | 'order_id' | 'parcel_id', value: string | undefined) {
  const [payment, setPayment] = useState<Payment | null>(null);

  useEffect(() => {
    if (!value) return;
    const load = () =>
      supabase.from('payments').select('*').eq(column, value).maybeSingle()
        .then(({ data }) => setPayment(data as Payment | null));
    load();

    const channel = supabase
      .channel(`payment:${column}:${value}`)
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'payments', filter: `${column}=eq.${value}` },
        load)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [column, value]);

  return payment;
}

export function usePayment(requestId: string | undefined) {
  return usePaymentBy('request_id', requestId);
}

export function useTripPayment(tripId: string | undefined) {
  return usePaymentBy('trip_id', tripId);
}

export function useBookingPayment(bookingId: string | undefined) {
  return usePaymentBy('booking_id', bookingId);
}

export function useOrderPayment(orderId: string | undefined) {
  return usePaymentBy('order_id', orderId);
}

export function useParcelPayment(parcelId: string | undefined) {
  return usePaymentBy('parcel_id', parcelId);
}
