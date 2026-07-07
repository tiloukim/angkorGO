'use client';
// Customer web — order tracking with realtime status + payment.
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { createClient } from '@/lib/supabase-browser';
import { ShopHeader } from '@/app/components/shop/ShopHeader';
import { WebPayment } from '@/app/components/shop/WebPayment';
import type { Language } from '@angkorgo/shared';
import { useShopLocale } from '@/lib/shop-i18n';

type Order = {
  id: string;
  status: string;
  total: number;
};

const STATUS: Record<Language, Record<string, { title: string; subtitle: string }>> = {
  en: {
    placed: { title: 'Order placed', subtitle: 'Waiting for the restaurant to accept.' },
    accepted: { title: 'Order accepted', subtitle: 'The restaurant is preparing your food.' },
    ready: { title: 'Ready for pickup', subtitle: 'Waiting for a courier.' },
    courier_assigned: { title: 'Courier assigned', subtitle: 'A courier is heading to the restaurant.' },
    picked_up: { title: 'Picked up', subtitle: 'Your order is on the way.' },
    delivering: { title: 'Out for delivery', subtitle: 'Your courier is almost there.' },
    delivered: { title: 'Delivered', subtitle: 'Enjoy your meal!' },
    cancelled: { title: 'Cancelled', subtitle: 'This order was cancelled.' },
  },
  km: {
    placed: { title: 'បានដាក់កម្ម៉ង់', subtitle: 'កំពុងរង់ចាំភោជនីយដ្ឋានទទួលយក។' },
    accepted: { title: 'បានទទួលកម្ម៉ង់', subtitle: 'ភោជនីយដ្ឋានកំពុងរៀបចំម្ហូបរបស់អ្នក។' },
    ready: { title: 'រួចរាល់សម្រាប់យក', subtitle: 'កំពុងរង់ចាំអ្នកដឹកជញ្ជូន។' },
    courier_assigned: { title: 'បានចាត់តាំងអ្នកដឹក', subtitle: 'អ្នកដឹកកំពុងទៅភោជនីយដ្ឋាន។' },
    picked_up: { title: 'បានយកម្ហូប', subtitle: 'កម្ម៉ង់របស់អ្នកកំពុងធ្វើដំណើរ។' },
    delivering: { title: 'កំពុងដឹកជញ្ជូន', subtitle: 'អ្នកដឹករបស់អ្នកជិតដល់ហើយ។' },
    delivered: { title: 'បានដឹកជញ្ជូន', subtitle: 'សូមរីករាយនឹងអាហាររបស់អ្នក!' },
    cancelled: { title: 'បានលុបចោល', subtitle: 'កម្ម៉ង់នេះត្រូវបានលុបចោល។' },
  },
  zh: {
    placed: { title: '已下单', subtitle: '等待餐厅接单。' },
    accepted: { title: '已接单', subtitle: '餐厅正在准备您的食物。' },
    ready: { title: '待取餐', subtitle: '等待配送员。' },
    courier_assigned: { title: '已分配配送员', subtitle: '配送员正前往餐厅。' },
    picked_up: { title: '已取餐', subtitle: '您的订单正在配送中。' },
    delivering: { title: '正在配送', subtitle: '配送员即将到达。' },
    delivered: { title: '已送达', subtitle: '祝您用餐愉快！' },
    cancelled: { title: '已取消', subtitle: '此订单已取消。' },
  },
};

const L: Record<Language, Record<string, string>> = {
  en: {
    loading: 'Loading…',
    notFound: 'Order not found.',
    total: 'Total',
    backToHome: 'Back to home',
  },
  km: {
    loading: 'កំពុងផ្ទុក…',
    notFound: 'រកមិនឃើញកម្ម៉ង់ទេ។',
    total: 'សរុប',
    backToHome: 'ត្រឡប់ទៅទំព័រដើម',
  },
  zh: {
    loading: '加载中…',
    notFound: '未找到订单。',
    total: '总计',
    backToHome: '返回首页',
  },
};

export default function OrderPage() {
  const params = useParams();
  const id = String(params.id);
  const { lang } = useShopLocale();
  const t = L[lang] ?? L.en;
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
  const info = order ? (STATUS[lang] ?? STATUS.en)[order.status] ?? { title: order.status, subtitle: '' } : null;

  return (
    <div className="min-h-screen bg-white text-black">
      <ShopHeader />
      <main className="mx-auto max-w-lg px-6 py-10">
        {loading ? (
          <p className="text-black/40">{t.loading}</p>
        ) : !order ? (
          <p className="text-black/40">{t.notFound}</p>
        ) : (
          <>
            <h1 className="text-4xl font-extrabold tracking-tight">{info?.title}</h1>
            <p className="mt-2 text-black/55">{info?.subtitle}</p>
            <p className="mt-4 text-lg font-bold text-grab">
              {t.total} ${Number(order.total ?? 0).toFixed(2)}
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
                {t.backToHome}
              </Link>
            )}
          </>
        )}
      </main>
    </div>
  );
}
