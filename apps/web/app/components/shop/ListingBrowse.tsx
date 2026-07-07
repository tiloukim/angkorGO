'use client';
// Shared browse grid for Rentals (vehicles) and Stays (places).
import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { Language } from '@angkorgo/shared';
import { createClient } from '@/lib/supabase-browser';
import { useShopLocale } from '@/lib/shop-i18n';
import { ShopHeader } from './ShopHeader';

const L: Record<Language, Record<string, string>> = {
  en: {
    rentTitle: 'Rent a vehicle',
    stayTitle: 'Book a stay',
    perDay: '/ day',
    perNight: '/ night',
    loading: 'Loading…',
    empty: 'Nothing available right now. Check back soon.',
  },
  km: {
    rentTitle: 'ជួលយានយន្ត',
    stayTitle: 'កក់កន្លែងស្នាក់នៅ',
    perDay: '/ ថ្ងៃ',
    perNight: '/ យប់',
    loading: 'កំពុងផ្ទុក…',
    empty: 'មិនមានអ្វីទំនេរនៅពេលនេះទេ។ សូមពិនិត្យមើលនៅពេលក្រោយ។',
  },
  zh: {
    rentTitle: '租车',
    stayTitle: '预订住宿',
    perDay: '/ 天',
    perNight: '/ 晚',
    loading: '加载中…',
    empty: '目前暂无可用项目。请稍后再来查看。',
  },
};

type Listing = {
  id: string;
  title: string;
  address: string | null;
  price_per_unit: number;
  currency: string;
  photos: string[] | null;
  rating: number | null;
};

export function ListingBrowse({ type, base }: { type: 'vehicle' | 'place'; base: string }) {
  const { lang } = useShopLocale();
  const t = L[lang] ?? L.en;
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const title = type === 'vehicle' ? t.rentTitle : t.stayTitle;
  const unitLabel = type === 'vehicle' ? t.perDay : t.perNight;
  const fallback = type === 'vehicle' ? '🚗' : '🏠';

  useEffect(() => {
    createClient()
      .from('listings')
      .select('id,title,address,price_per_unit,currency,photos,rating')
      .eq('type', type)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setListings((data as Listing[]) ?? []);
        setLoading(false);
      });
  }, [type]);

  return (
    <div className="min-h-screen bg-white text-black">
      <ShopHeader />
      <main className="mx-auto max-w-6xl px-6 py-10">
        <h1 className="text-3xl font-extrabold tracking-tight">{title}</h1>

        {loading ? (
          <p className="mt-8 text-black/55">{t.loading}</p>
        ) : listings.length === 0 ? (
          <p className="mt-8 text-black/55">{t.empty}</p>
        ) : (
          <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {listings.map((l) => (
              <Link
                key={l.id}
                href={`${base}/${l.id}`}
                className="group overflow-hidden rounded-2xl border border-black/10 transition hover:border-grab hover:shadow-lg"
              >
                <div className="flex aspect-[4/3] items-center justify-center bg-[#f6f6f6] text-6xl">
                  {l.photos?.[0] ? (
                    <img src={l.photos[0]} alt={l.title} className="h-full w-full object-cover" />
                  ) : (
                    <span>{fallback}</span>
                  )}
                </div>
                <div className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <h2 className="font-extrabold tracking-tight">{l.title}</h2>
                    {l.rating != null && (
                      <span className="shrink-0 text-sm font-semibold text-black/70">⭐ {Number(l.rating).toFixed(1)}</span>
                    )}
                  </div>
                  {l.address && <p className="mt-1 line-clamp-1 text-sm text-black/55">{l.address}</p>}
                  <p className="mt-2 font-bold text-grab">
                    ${Number(l.price_per_unit).toFixed(2)} {l.currency}
                    <span className="font-medium text-black/45"> {unitLabel}</span>
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
