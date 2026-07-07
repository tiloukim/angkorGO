'use client';
// Booking status — realtime. Requested → waiting; confirmed+ → pay; declined/cancelled → notice.
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import type { Language } from '@angkorgo/shared';
import { createClient } from '@/lib/supabase-browser';
import { useShopLocale } from '@/lib/shop-i18n';
import { ShopHeader } from '@/app/components/shop/ShopHeader';
import { WebPayment } from '@/app/components/shop/WebPayment';

const L: Record<Language, Record<string, string>> = {
  en: {
    loading: 'Loading…',
    notFound: 'Booking not found.',
    yourBooking: 'Your booking',
    waitingTitle: 'Waiting for the host to confirm',
    waitingBody: "We'll update this page as soon as they respond. Payment starts once it's confirmed.",
    confirmedPay: 'Confirmed — complete your payment',
    declined: 'The host declined this booking',
    cancelled: 'This booking was cancelled',
    noCharge: 'No charge was made. Feel free to browse other options.',
    cancelBooking: 'Cancel booking',
    cancelPrompt: 'Cancel this booking?',
    backHome: '← Back to home',
  },
  km: {
    loading: 'កំពុងផ្ទុក…',
    notFound: 'រកមិនឃើញការកក់ទេ។',
    yourBooking: 'ការកក់របស់អ្នក',
    waitingTitle: 'កំពុងរង់ចាំម្ចាស់ផ្ទះបញ្ជាក់',
    waitingBody: 'យើងនឹងធ្វើបច្ចុប្បន្នភាពទំព័រនេះ ភ្លាមៗនៅពេលពួកគេឆ្លើយតប។ ការទូទាត់ចាប់ផ្តើម នៅពេលវាត្រូវបានបញ្ជាក់។',
    confirmedPay: 'បានបញ្ជាក់ — សូមបំពេញការទូទាត់របស់អ្នក',
    declined: 'ម្ចាស់ផ្ទះបានបដិសេធការកក់នេះ',
    cancelled: 'ការកក់នេះត្រូវបានបោះបង់',
    noCharge: 'មិនមានការគិតថ្លៃទេ។ សូមរីករាយក្នុងការរកមើលជម្រើសផ្សេងទៀត។',
    cancelBooking: 'បោះបង់ការកក់',
    cancelPrompt: 'បោះបង់ការកក់នេះមែនទេ?',
    backHome: '← ត្រឡប់ទៅទំព័រដើម',
  },
  zh: {
    loading: '加载中…',
    notFound: '未找到预订。',
    yourBooking: '您的预订',
    waitingTitle: '等待房东确认',
    waitingBody: '一旦房东回复，我们会立即更新此页面。确认后即可开始付款。',
    confirmedPay: '已确认 — 请完成付款',
    declined: '房东已拒绝此预订',
    cancelled: '此预订已取消',
    noCharge: '未产生任何费用。欢迎浏览其他选择。',
    cancelBooking: '取消预订',
    cancelPrompt: '确定取消此预订吗？',
    backHome: '← 返回首页',
  },
};

type Booking = {
  id: string;
  status: 'requested' | 'confirmed' | 'declined' | 'cancelled' | 'in_progress' | 'completed';
  total_amount: number;
  start_date: string;
  end_date: string;
};

const PAY_STATES = ['confirmed', 'in_progress', 'completed'];

export default function BookingStatusPage() {
  const { lang } = useShopLocale();
  const t = L[lang] ?? L.en;
  const params = useParams();
  const id = params.id as string;
  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);

  async function cancel() {
    if (!confirm(t.cancelPrompt)) return;
    const { error } = await createClient().rpc('cancel_booking', { p_booking: id, p_reason: 'guest_cancelled' });
    if (error) alert(error.message);
  }

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
          <p className="text-black/55">{t.loading}</p>
        ) : !booking ? (
          <p className="text-black/55">{t.notFound}</p>
        ) : (
          <>
            <h1 className="text-3xl font-extrabold tracking-tight">{t.yourBooking}</h1>
            <p className="mt-1 text-black/55">
              {booking.start_date} → {booking.end_date}
            </p>

            <div className="mt-8">
              {booking.status === 'requested' && (
                <div className="rounded-2xl bg-grab-soft p-6 text-center">
                  <p className="text-lg font-extrabold text-grab-dark">{t.waitingTitle}</p>
                  <p className="mt-1 text-sm text-black/55">{t.waitingBody}</p>
                </div>
              )}

              {PAY_STATES.includes(booking.status) && (
                <div>
                  <p className="mb-4 font-semibold text-grab-dark">{t.confirmedPay}</p>
                  <WebPayment column="booking_id" value={id} />
                </div>
              )}

              {(booking.status === 'declined' || booking.status === 'cancelled') && (
                <div className="rounded-2xl border border-black/10 p-6 text-center">
                  <p className="text-lg font-extrabold text-danger">
                    {booking.status === 'declined' ? t.declined : t.cancelled}
                  </p>
                  <p className="mt-1 text-sm text-black/55">{t.noCharge}</p>
                </div>
              )}
            </div>

            {(booking.status === 'requested' || booking.status === 'confirmed') && (
              <button onClick={cancel} className="mt-6 block text-sm font-semibold text-danger hover:underline">
                {t.cancelBooking}
              </button>
            )}

            <Link href="/" className="mt-8 inline-block text-sm font-semibold text-grab hover:text-grab-dark">
              {t.backHome}
            </Link>
          </>
        )}
      </main>
    </div>
  );
}
