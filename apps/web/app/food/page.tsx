'use client';
// Customer web — list of active restaurants.
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase-browser';
import { ShopHeader } from '@/app/components/shop/ShopHeader';
import type { Language } from '@angkorgo/shared';
import { useShopLocale } from '@/lib/shop-i18n';

type Restaurant = {
  id: string;
  name: string;
  cuisine: string | null;
  photo_url: string | null;
  rating: number | null;
  is_open: boolean;
};

const L: Record<Language, Record<string, string>> = {
  en: {
    title: 'Food delivery',
    subtitle: 'Order from restaurants near you.',
    loading: 'Loading…',
    empty: 'No restaurants available right now.',
    restaurant: 'Restaurant',
    closed: 'Closed',
  },
  km: {
    title: 'ដឹកជញ្ជូនអាហារ',
    subtitle: 'កម្ម៉ង់ពីភោជនីយដ្ឋាននៅជិតអ្នក។',
    loading: 'កំពុងផ្ទុក…',
    empty: 'មិនមានភោជនីយដ្ឋានទេឥឡូវនេះ។',
    restaurant: 'ភោជនីយដ្ឋាន',
    closed: 'បិទ',
  },
  zh: {
    title: '美食外卖',
    subtitle: '从您附近的餐厅点餐。',
    loading: '加载中…',
    empty: '目前没有可用的餐厅。',
    restaurant: '餐厅',
    closed: '已打烊',
  },
};

export default function FoodPage() {
  const { lang } = useShopLocale();
  const t = L[lang] ?? L.en;
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    createClient()
      .from('restaurants')
      .select('id,name,cuisine,photo_url,rating,is_open')
      .eq('status', 'active')
      .order('rating', { ascending: false })
      .then(({ data }) => {
        setRestaurants((data as Restaurant[]) ?? []);
        setLoading(false);
      });
  }, []);

  return (
    <div className="min-h-screen bg-white text-black">
      <ShopHeader />
      <main className="mx-auto max-w-6xl px-6 py-10">
        <h1 className="text-4xl font-extrabold tracking-tight">{t.title}</h1>
        <p className="mt-2 text-black/55">{t.subtitle}</p>

        {loading ? (
          <p className="mt-10 text-black/40">{t.loading}</p>
        ) : restaurants.length === 0 ? (
          <p className="mt-10 text-black/40">{t.empty}</p>
        ) : (
          <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {restaurants.map((r) => (
              <Link
                key={r.id}
                href={`/food/${r.id}`}
                className="group overflow-hidden rounded-2xl border border-black/10 transition hover:shadow-lg"
              >
                <div className="flex h-44 items-center justify-center bg-grab-soft">
                  {r.photo_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={r.photo_url} alt={r.name} className="h-full w-full object-cover" />
                  ) : (
                    <span className="text-5xl">🍜</span>
                  )}
                </div>
                <div className="p-4">
                  <h2 className="text-lg font-extrabold tracking-tight">{r.name}</h2>
                  <p className="mt-1 text-sm text-black/55">
                    {r.cuisine || t.restaurant} · ⭐ {(r.rating ?? 0).toFixed(1)}
                    {!r.is_open && <span className="text-danger"> · {t.closed}</span>}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
