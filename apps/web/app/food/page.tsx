'use client';
// Customer web — list of active restaurants.
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase-browser';
import { ShopHeader } from '@/app/components/shop/ShopHeader';

type Restaurant = {
  id: string;
  name: string;
  cuisine: string | null;
  photo_url: string | null;
  rating: number | null;
  is_open: boolean;
};

export default function FoodPage() {
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
        <h1 className="text-4xl font-extrabold tracking-tight">Food delivery</h1>
        <p className="mt-2 text-black/55">Order from restaurants near you.</p>

        {loading ? (
          <p className="mt-10 text-black/40">Loading…</p>
        ) : restaurants.length === 0 ? (
          <p className="mt-10 text-black/40">No restaurants available right now.</p>
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
                    {r.cuisine || 'Restaurant'} · ⭐ {(r.rating ?? 0).toFixed(1)}
                    {!r.is_open && <span className="text-danger"> · Closed</span>}
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
