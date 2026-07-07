'use client';
// Customer web — order tracking with realtime status + payment.
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { createClient } from '@/lib/supabase-browser';
import { ShopHeader } from '@/app/components/shop/ShopHeader';
import { WebPayment } from '@/app/components/shop/WebPayment';

type Order = {
  id: string;
  status: string;
  total: number;
};

const STATUS: Record<string, { title: string; subtitle: string }> = {
  placed: { title: 'Order placed', subtitle: 'Waiting for the restaurant to accept.' },
  accepted: { title: 'Order accepted', subtitle: 'The restaurant is preparing your food.' },
  ready: { title: 'Ready for pickup', subtitle: 'Waiting for a courier.' },
  courier_assigned: { title: 'Courier assigned', subtitle: 'A courier is heading to the restaurant.' },
  picked_up: { title: 'Picked up', subtitle: 'Your order is on the way.' },
  delivering: { title: 'Out for delivery', subtitle: 'Your courier is almost there.' },
  delivered: { title: 'Delivered', subtitle: 'Enjoy your meal!' },
  cancelled: { title: 'Cancelled', subtitle: 'This order was cancelled.' },
};

export default function OrderPage() {
  const params = useParams();
  const id = String(params.id);
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    const load = () =>
      supabase
        .from('orders')
        .select('id,status,total')
        .eq('id', id)
        .maybeSingle()
        .then(({ data }) => {
          setOrder(data as Order | null);
          setLoading(false);
        });
    load();
    const ch = supabase
      .channel(`order:${id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders', filter: `id=eq.${id}` },
        load,
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [id]);

  const done = order?.status === 'delivered' || order?.status === 'cancelled';
  const info = order ? STATUS[order.status] ?? { title: order.status, subtitle: '' } : null;

  return (
    <div className="min-h-screen bg-white text-black">
      <ShopHeader />
      <main className="mx-auto max-w-lg px-6 py-10">
        {loading ? (
          <p className="text-black/40">Loading…</p>
        ) : !order ? (
          <p className="text-black/40">Order not found.</p>
        ) : (
          <>
            <h1 className="text-4xl font-extrabold tracking-tight">{info?.title}</h1>
            <p className="mt-2 text-black/55">{info?.subtitle}</p>
            <p className="mt-4 text-lg font-bold text-grab">
              Total ${Number(order.total ?? 0).toFixed(2)}
            </p>

            {!done && (
              <div className="mt-8">
                <WebPayment column="order_id" value={id} />
              </div>
            )}

            {done && (
              <Link
                href="/"
                className="mt-8 inline-block rounded-full bg-grab px-8 py-3 font-bold text-white hover:brightness-110"
              >
                Back to home
              </Link>
            )}
          </>
        )}
      </main>
    </div>
  );
}
