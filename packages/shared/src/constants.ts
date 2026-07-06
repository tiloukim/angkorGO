// Shared domain constants for AngkorGo.

export const SERVICE_CATEGORIES = [
  'flat_tire',
  'battery_jump_start',
  'battery_replacement',
  'fuel_delivery',
  'lockout_service',
  'tow_truck',
  'engine_diagnosis',
  'emergency_repair',
  'motorcycle_repair',
  'car_repair',
  'van_repair',
  'truck_repair',
] as const;

export type ServiceCategory = (typeof SERVICE_CATEGORIES)[number];

// Icon hints map to lucide-react (web) / lucide-react-native (mobile).
export const CATEGORY_META: Record<ServiceCategory, { icon: string; emergency: boolean }> = {
  flat_tire:           { icon: 'CircleDot',      emergency: true },
  battery_jump_start:  { icon: 'BatteryCharging', emergency: true },
  battery_replacement: { icon: 'Battery',        emergency: false },
  fuel_delivery:       { icon: 'Fuel',           emergency: true },
  lockout_service:     { icon: 'Lock',           emergency: true },
  tow_truck:           { icon: 'Truck',          emergency: true },
  engine_diagnosis:    { icon: 'Cog',            emergency: true },
  emergency_repair:    { icon: 'Wrench',         emergency: true },
  motorcycle_repair:   { icon: 'Bike',           emergency: false },
  car_repair:          { icon: 'Car',            emergency: false },
  van_repair:          { icon: 'Bus',            emergency: false },
  truck_repair:        { icon: 'Truck',          emergency: false },
};

// Dispatch: expand the search radius until a provider accepts.
export const DISPATCH_RADII_KM = [5, 10, 20] as const;
export const OFFER_TTL_SECONDS = 45;

// Commission split — AngkorGo keeps 10%, provider gets 90% (configurable in DB).
export const DEFAULT_COMMISSION_RATE = 0.1;
export const DEFAULT_PROVIDER_RATE = 1 - DEFAULT_COMMISSION_RATE;

export const LOCATION_HEARTBEAT_MS = 5000;

export const REQUEST_STATUSES = [
  'pending', 'dispatching', 'accepted', 'en_route',
  'arrived', 'in_progress', 'completed', 'cancelled', 'expired',
] as const;
export type RequestStatus = (typeof REQUEST_STATUSES)[number];

export type UserRole = 'customer' | 'provider' | 'admin';
export type Language = 'en' | 'km';
export type ImageKind = 'vehicle' | 'problem' | 'before' | 'after' | 'invoice';

// ---- AngkorGo Ride (ride-hailing vertical) ----
export const VEHICLE_CLASSES = ['moto', 'tuktuk', 'car'] as const;
export type VehicleClass = (typeof VEHICLE_CLASSES)[number];

export const VEHICLE_LABELS: Record<Language, Record<VehicleClass, string>> = {
  en: { moto: 'Moto', tuktuk: 'Tuk-tuk', car: 'Car' },
  km: { moto: 'ម៉ូតូ', tuktuk: 'តុកតុក', car: 'ឡាន' },
};

export const TRIP_STATUSES = [
  'requested', 'searching', 'matched', 'driver_arriving', 'driver_arrived',
  'in_progress', 'completed', 'cancelled', 'expired', 'no_drivers',
] as const;
export type TripStatus = (typeof TRIP_STATUSES)[number];

// Ride dispatch radius is tighter than rescue (urban density).
export const RIDE_DISPATCH_RADII_KM = [2, 3, 5] as const;
// KHR per USD, for dual-currency display.
export const KHR_PER_USD = 4100;

export type PaymentMethod = 'aba_payway' | 'khqr' | 'stripe' | 'wing' | 'acleda' | 'cash';

// Payment options shown to the customer, in display order.
export const PAYMENT_METHODS: { method: PaymentMethod; label: string; kind: 'qr' | 'card' | 'cash' }[] = [
  { method: 'khqr', label: 'KHQR', kind: 'qr' },
  { method: 'aba_payway', label: 'ABA PayWay', kind: 'qr' },
  { method: 'wing', label: 'Wing', kind: 'qr' },
  { method: 'acleda', label: 'ACLEDA', kind: 'qr' },
  { method: 'stripe', label: 'Card (Stripe)', kind: 'card' },
  { method: 'cash', label: 'Cash', kind: 'cash' },
];
