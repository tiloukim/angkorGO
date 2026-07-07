'use client';
// Booking status — realtime. Requested → waiting; confirmed+ → pay; declined/cancelled → notice.
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { createClient } from '@/lib/supabase-browser';
import { ShopHeader } from '@/app/components/shop/ShopHeader';
import { WebPayment } from '@/app/components/shop/WebPayment';

type Booking = {
  id: string;
  status: 'requested' | 'confirmed' | 'declined' | 'cancelled' | 'in_progress' | 'completed';
  total_amount: number;
  start_date: string;
  end_date: string;
};

const PAY_STATES = ['confirmed', 'in_progress', 'completed'];

export default function BookingStatusPage() {
  const params = useParams();
  const id = params.id as string;
  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    const load = () =>
      supabase
        .from('bookings')
        .select('id,status,total_amount,start_date,end_date')
        .eq('id', id)
        .maybeSingle()
        .then(({ data }) => {
          setBooking(data as Booking | null);
          setLoading(false);
        });
    load();
    const ch = supabase
      .channel(`booking:${id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings', filter: `id=eq.${id}` }, load)
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [id]);

  return (
    <div className="min-h-screen bg-white text-black">
      <ShopHeader />
      <main className="mx-auto max-w-lg px-6 py-12">
        {loading ? (
          <p className="text-black/55">Loading…</p>
        ) : !booking ? (
          <p className="text-black/55">Booking not found.</p>
        ) : (
          <>
            <h1 className="text-3xl font-extrabold tracking-tight">Your booking</h1>
            <p className="mt-1 text-black/55">
              {booking.start_date} → {booking.end_date}
            </p>

            <div className="mt-8">
              {booking.status === 'requested' && (
                <div className="rounded-2xl bg-grab-soft p-6 text-center">
                  <p className="text-lg font-extrabold text-grab-dark">Waiting for the host to confirm</p>
                  <p className="mt-1 text-sm text-black/55">
                    We&apos;ll update this page as soon as they respond. Payment starts once it&apos;s confirmed.
                  </p>
                </div>
              )}

              {PAY_STATES.includes(booking.status) && (
                <div>
                  <p className="mb-4 font-semibold text-grab-dark">Confirmed — complete your payment</p>
                  <WebPayment column="booking_id" value={id} />
                </div>
              )}

              {(booking.status === 'declined' || booking.status === 'cancelled') && (
                <div className="rounded-2xl border border-black/10 p-6 text-center">
                  <p className="text-lg font-extrabold text-danger">
                    {booking.status === 'declined' ? 'The host declined this booking' : 'This booking was cancelled'}
                  </p>
                  <p className="mt-1 text-sm text-black/55">No charge was made. Feel free to browse other options.</p>
                </div>
              )}
            </div>

            <Link href="/" className="mt-8 inline-block text-sm font-semibold text-grab hover:text-grab-dark">
              ← Back to home
            </Link>
          </>
        )}
      </main>
    </div>
  );
}
