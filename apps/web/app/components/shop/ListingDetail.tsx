'use client';
// Shared detail + booking form for Rentals (vehicles) and Stays (places).
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase-browser';
import { ShopHeader } from './ShopHeader';
import { AuthModal } from './AuthModal';

type Listing = {
  id: string;
  type: 'vehicle' | 'place';
  title: string;
  description: string | null;
  price_per_unit: number;
  deposit: number | null;
  cleaning_fee: number | null;
  currency: string;
  address: string | null;
  photos: string[] | null;
  attributes: any;
  rating: number | null;
};

export function ListingDetail({ type, base }: { type: 'vehicle' | 'place'; base: string }) {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const unit = type === 'vehicle' ? 'day' : 'night';
  const unitPlural = type === 'vehicle' ? 'days' : 'nights';
  const fallback = type === 'vehicle' ? '🚗' : '🏠';

  const [listing, setListing] = useState<Listing | null>(null);
  const [loading, setLoading] = useState(true);
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [guests, setGuests] = useState(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [showAuth, setShowAuth] = useState(false);

  useEffect(() => {
    createClient()
      .from('listings')
      .select('*')
      .eq('id', id)
      .eq('status', 'active')
      .maybeSingle()
      .then(({ data }) => {
        setListing(data as Listing | null);
        setLoading(false);
      });
  }, [id]);

  const units =
    start && end ? Math.max(0, Math.round((new Date(end).getTime() - new Date(start).getTime()) / 86400000)) : 0;

  const price = listing
    ? Number(listing.price_per_unit) * units + Number(listing.cleaning_fee ?? 0) + Number(listing.deposit ?? 0)
    : 0;

  async function requestBook() {
    if (!listing) return;
    setError('');
    if (!start || !end || new Date(end) <= new Date(start)) {
      setError('Please pick an end date after the start date.');
      return;
    }
    setBusy(true);
    const supabase = createClient();
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      setBusy(false);
      setShowAuth(true);
      return;
    }
    const { data, error: rpcError } = await supabase.rpc('create_booking', {
      p_listing: listing.id,
      p_start: start,
      p_end: end,
      p_guests: type === 'place' ? guests : 1,
    });
    setBusy(false);
    if (rpcError) {
      setError(rpcError.message);
      return;
    }
    router.push('/bookings/' + data);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-white text-black">
        <ShopHeader />
        <main className="mx-auto max-w-6xl px-6 py-10">
          <p className="text-black/55">Loading…</p>
        </main>
      </div>
    );
  }

  if (!listing) {
    return (
      <div className="min-h-screen bg-white text-black">
        <ShopHeader />
        <main className="mx-auto max-w-6xl px-6 py-10">
          <p className="text-black/55">This listing is no longer available.</p>
        </main>
      </div>
    );
  }

  const a = listing.attributes ?? {};

  return (
    <div className="min-h-screen bg-white text-black">
      <ShopHeader />
      <main className="mx-auto max-w-6xl px-6 py-10">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-[1.4fr_1fr]">
          {/* Left: details */}
          <div>
            <div className="flex aspect-[16/9] items-center justify-center overflow-hidden rounded-2xl bg-[#f6f6f6] text-7xl">
              {listing.photos?.[0] ? (
                <img src={listing.photos[0]} alt={listing.title} className="h-full w-full object-cover" />
              ) : (
                <span>{fallback}</span>
              )}
            </div>

            {listing.photos && listing.photos.length > 1 && (
              <div className="mt-3 grid grid-cols-4 gap-3">
                {listing.photos.slice(1, 5).map((p, i) => (
                  <img key={i} src={p} alt="" className="aspect-square w-full rounded-xl object-cover" />
                ))}
              </div>
            )}

            <div className="mt-6 flex items-start justify-between gap-3">
              <h1 className="text-3xl font-extrabold tracking-tight">{listing.title}</h1>
              {listing.rating != null && (
                <span className="shrink-0 pt-1 font-semibold text-black/70">⭐ {Number(listing.rating).toFixed(1)}</span>
              )}
            </div>
            {listing.address && <p className="mt-1 text-black/55">{listing.address}</p>}

            {/* Attributes */}
            <div className="mt-5 flex flex-wrap gap-2">
              {type === 'vehicle' ? (
                <>
                  {a.seats != null && <Chip>{a.seats} seats</Chip>}
                  {a.transmission && <Chip>{a.transmission}</Chip>}
                  {a.year != null && <Chip>{a.year}</Chip>}
                </>
              ) : (
                <>
                  {a.beds != null && <Chip>{a.beds} beds</Chip>}
                  {a.baths != null && <Chip>{a.baths} baths</Chip>}
                  {a.max_guests != null && <Chip>Up to {a.max_guests} guests</Chip>}
                </>
              )}
            </div>

            {listing.description && (
              <p className="mt-6 whitespace-pre-line leading-relaxed text-black/70">{listing.description}</p>
            )}

            {type === 'place' && Array.isArray(a.amenities) && a.amenities.length > 0 && (
              <div className="mt-6">
                <h3 className="font-extrabold tracking-tight">Amenities</h3>
                <div className="mt-3 flex flex-wrap gap-2">
                  {a.amenities.map((am: string) => (
                    <Chip key={am}>{am}</Chip>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right: booking card */}
          <div className="lg:sticky lg:top-24 lg:self-start">
            <div className="rounded-2xl border border-black/10 p-6">
              <p className="text-3xl font-black text-grab">
                ${Number(listing.price_per_unit).toFixed(2)} {listing.currency}
                <span className="text-base font-medium text-black/45"> / {unit}</span>
              </p>

              <div className="mt-5 grid grid-cols-2 gap-3">
                <label className="text-sm font-semibold text-black/60">
                  Start
                  <input
                    type="date"
                    value={start}
                    onChange={(e) => setStart(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-black/10 bg-[#f6f6f6] p-3 outline-none focus:border-grab"
                  />
                </label>
                <label className="text-sm font-semibold text-black/60">
                  End
                  <input
                    type="date"
                    value={end}
                    onChange={(e) => setEnd(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-black/10 bg-[#f6f6f6] p-3 outline-none focus:border-grab"
                  />
                </label>
              </div>

              {type === 'place' && (
                <label className="mt-3 block text-sm font-semibold text-black/60">
                  Guests
                  <input
                    type="number"
                    min={1}
                    value={guests}
                    onChange={(e) => setGuests(Math.max(1, Number(e.target.value)))}
                    className="mt-1 w-full rounded-xl border border-black/10 bg-[#f6f6f6] p-3 outline-none focus:border-grab"
                  />
                </label>
              )}

              {units > 0 && (
                <div className="mt-5 space-y-2 border-t border-black/10 pt-4 text-sm">
                  <Row
                    label={`$${Number(listing.price_per_unit).toFixed(2)} × ${units} ${unitPlural}`}
                    value={Number(listing.price_per_unit) * units}
                    currency={listing.currency}
                  />
                  {Number(listing.cleaning_fee ?? 0) > 0 && (
                    <Row label="Cleaning fee" value={Number(listing.cleaning_fee)} currency={listing.currency} />
                  )}
                  {Number(listing.deposit ?? 0) > 0 && (
                    <Row label="Deposit" value={Number(listing.deposit)} currency={listing.currency} />
                  )}
                  <div className="flex justify-between border-t border-black/10 pt-2 font-extrabold">
                    <span>Total</span>
                    <span>
                      ${price.toFixed(2)} {listing.currency}
                    </span>
                  </div>
                </div>
              )}

              {error && <p className="mt-3 text-sm text-danger">{error}</p>}

              <button
                onClick={requestBook}
                disabled={busy}
                className="mt-5 w-full rounded-xl bg-grab p-4 font-bold text-white hover:brightness-110 disabled:opacity-60"
              >
                {busy ? 'Requesting…' : 'Request to book'}
              </button>
            </div>
          </div>
        </div>
      </main>

      {showAuth && (
        <AuthModal onClose={() => setShowAuth(false)} onSignedIn={() => setShowAuth(false)} />
      )}
    </div>
  );
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full bg-grab-soft px-3 py-1 text-sm font-semibold text-grab-dark">{children}</span>
  );
}

function Row({ label, value, currency }: { label: string; value: number; currency: string }) {
  return (
    <div className="flex justify-between text-black/70">
      <span>{label}</span>
      <span>
        ${value.toFixed(2)} {currency}
      </span>
    </div>
  );
}
