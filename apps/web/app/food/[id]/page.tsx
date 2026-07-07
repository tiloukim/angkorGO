'use client';
// Customer web — restaurant menu, cart, and checkout.
import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase-browser';
import { ShopHeader } from '@/app/components/shop/ShopHeader';
import { AuthModal } from '@/app/components/shop/AuthModal';
import type { Language } from '@angkorgo/shared';
import { useShopLocale } from '@/lib/shop-i18n';

type MenuItem = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  category: string | null;
};

const L: Record<Language, Record<string, string>> = {
  en: {
    restaurant: 'Restaurant',
    loadingMenu: 'Loading menu…',
    noItems: 'No items available.',
    add: 'Add',
    deliveryAddress: 'Delivery address',
    addressPlaceholder: 'Street, building, notes…',
    enterAddress: 'Please enter a delivery address.',
    item: 'item',
    items: 'items',
    placing: 'Placing…',
    checkout: 'Checkout',
  },
  km: {
    restaurant: 'ភោជនីយដ្ឋាន',
    loadingMenu: 'កំពុងផ្ទុកម៉ឺនុយ…',
    noItems: 'មិនមានមុខម្ហូបទេ។',
    add: 'បន្ថែម',
    deliveryAddress: 'អាសយដ្ឋានដឹកជញ្ជូន',
    addressPlaceholder: 'ផ្លូវ អគារ កំណត់សម្គាល់…',
    enterAddress: 'សូមបញ្ចូលអាសយដ្ឋានដឹកជញ្ជូន។',
    item: 'មុខ',
    items: 'មុខ',
    placing: 'កំពុងកម្ម៉ង់…',
    checkout: 'បង់ប្រាក់',
  },
  zh: {
    restaurant: '餐厅',
    loadingMenu: '正在加载菜单…',
    noItems: '暂无可用菜品。',
    add: '添加',
    deliveryAddress: '配送地址',
    addressPlaceholder: '街道、楼栋、备注…',
    enterAddress: '请输入配送地址。',
    item: '份',
    items: '份',
    placing: '正在下单…',
    checkout: '结账',
  },
};

const PHNOM_PENH = { lat: 11.5564, lng: 104.9219 };

function getCoords(): Promise<{ lat: number; lng: number }> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) return resolve(PHNOM_PENH);
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => resolve(PHNOM_PENH),
      { timeout: 5000 },
    );
  });
}

export default function RestaurantPage() {
  const params = useParams();
  const router = useRouter();
  const id = String(params.id);
  const { lang } = useShopLocale();
  const t = L[lang] ?? L.en;

  const [name, setName] = useState('');
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState<Record<string, number>>({});
  const [address, setAddress] = useState('');
  const [auth, setAuth] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from('restaurants')
      .select('name')
      .eq('id', id)
      .maybeSingle()
      .then(({ data }) => setName((data as { name: string } | null)?.name ?? t.restaurant));
    supabase
      .from('menu_items')
      .select('id,name,description,price,category')
      .eq('restaurant_id', id)
      .eq('available', true)
      .then(({ data }) => {
        setItems((data as MenuItem[]) ?? []);
        setLoading(false);
      });
  }, [id]);

  const setQty = (itemId: string, qty: number) =>
    setCart((c) => {
      const next = { ...c };
      if (qty <= 0) delete next[itemId];
      else next[itemId] = qty;
      return next;
    });

  const count = useMemo(() => Object.values(cart).reduce((a, b) => a + b, 0), [cart]);
  const subtotal = useMemo(
    () =>
      items.reduce((sum, it) => sum + (cart[it.id] ?? 0) * Number(it.price), 0),
    [items, cart],
  );

  async function checkout() {
    setErr('');
    const {
      data: { user },
    } = await createClient().auth.getUser();
    if (!user) return setAuth(true);
    if (!address.trim()) return setErr(t.enterAddress);
    if (count === 0) return;

    setBusy(true);
    const coords = await getCoords();
    const p_items = Object.entries(cart).map(([menu_item_id, qty]) => ({ menu_item_id, qty }));
    const { data, error } = await createClient().rpc('place_order', {
      p_restaurant: id,
      p_items,
      p_lng: coords.lng,
      p_lat: coords.lat,
      p_address: address.trim(),
      p_method: 'khqr',
    });
    setBusy(false);
    if (error) return setErr(error.message);
    router.push('/orders/' + (data as string));
  }

  return (
    <div className="min-h-screen bg-white text-black">
      <ShopHeader />
      <main className="mx-auto max-w-3xl px-6 py-10 pb-32">
        <h1 className="text-4xl font-extrabold tracking-tight">{name}</h1>

        {loading ? (
          <p className="mt-10 text-black/40">{t.loadingMenu}</p>
        ) : items.length === 0 ? (
          <p className="mt-10 text-black/40">{t.noItems}</p>
        ) : (
          <div className="mt-8 space-y-3">
            {items.map((it) => {
              const qty = cart[it.id] ?? 0;
              return (
                <div
                  key={it.id}
                  className="flex items-center justify-between gap-4 rounded-2xl border border-black/10 p-4"
                >
                  <div className="min-w-0">
                    <h3 className="font-extrabold tracking-tight">{it.name}</h3>
                    {it.description && (
                      <p className="mt-0.5 text-sm text-black/55">{it.description}</p>
                    )}
                    <p className="mt-1 font-bold text-grab">${Number(it.price).toFixed(2)}</p>
                  </div>
                  {qty === 0 ? (
                    <button
                      onClick={() => setQty(it.id, 1)}
                      className="shrink-0 rounded-full bg-grab px-5 py-2 text-sm font-bold text-white hover:brightness-110"
                    >
                      {t.add}
                    </button>
                  ) : (
                    <div className="flex shrink-0 items-center gap-3">
                      <button
                        onClick={() => setQty(it.id, qty - 1)}
                        className="h-8 w-8 rounded-full bg-grab-soft text-lg font-bold text-grab-dark hover:brightness-95"
                      >
                        −
                      </button>
                      <span className="w-5 text-center font-bold">{qty}</span>
                      <button
                        onClick={() => setQty(it.id, qty + 1)}
                        className="h-8 w-8 rounded-full bg-grab text-lg font-bold text-white hover:brightness-110"
                      >
                        +
                      </button>
                    </div>
                  )}
                </div>
              );
            })}

            <div className="pt-4">
              <label className="text-sm font-semibold text-black/55">{t.deliveryAddress}</label>
              <input
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder={t.addressPlaceholder}
                className="mt-1 w-full rounded-xl border border-black/10 bg-[#f6f6f6] p-4 outline-none focus:border-grab"
              />
            </div>
          </div>
        )}

        {err && <p className="mt-4 text-sm text-danger">{err}</p>}
      </main>

      {count > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-black/10 bg-white">
          <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-6 py-4">
            <div>
              <p className="text-sm text-black/55">
                {count} {count > 1 ? t.items : t.item}
              </p>
              <p className="text-xl font-black">${subtotal.toFixed(2)}</p>
            </div>
            <button
              onClick={checkout}
              disabled={busy}
              className="rounded-full bg-grab px-8 py-3 font-bold text-white hover:brightness-110 disabled:opacity-60"
            >
              {busy ? t.placing : t.checkout}
            </button>
          </div>
        </div>
      )}

      {auth && <AuthModal onClose={() => setAuth(false)} onSignedIn={() => setAuth(false)} />}
    </div>
  );
}
