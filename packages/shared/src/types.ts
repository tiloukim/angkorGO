// Hand-written DB row types mirroring supabase/migrations.
// Replace with `supabase gen types typescript` once the project is linked.
import type { PaymentMethod, RequestStatus, ServiceCategory, UserRole } from './constants';

export type ProviderStatus = 'pending' | 'approved' | 'suspended' | 'rejected';
export type AssignmentStatus = 'offered' | 'accepted' | 'rejected' | 'expired' | 'cancelled';
export type PaymentStatus = 'pending' | 'held' | 'released' | 'refunded' | 'failed';
// PaymentMethod is exported from constants.ts.

export interface Profile {
  id: string;
  role: UserRole;
  full_name: string | null;
  phone: string | null;
  avatar_url: string | null;
  preferred_language: 'en' | 'km';
  onboarded: boolean;
  is_suspended: boolean;
  created_at: string;
  updated_at: string;
}

export interface Provider {
  id: string;
  user_id: string;
  business_name: string | null;
  bio: string | null;
  status: ProviderStatus;
  is_online: boolean;
  rating: number;
  total_jobs: number;
  commission_rate: number;
  approved_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ServiceRequest {
  id: string;
  customer_id: string;
  category: ServiceCategory;
  status: RequestStatus;
  // GeoJSON is returned when selected as st_asgeojson; raw column is geography.
  pickup_location: { type: 'Point'; coordinates: [number, number] } | string;
  address: string | null;
  vehicle_type: string | null;
  notes: string | null;
  current_radius_km: number;
  assigned_provider_id: string | null;
  created_at: string;
  updated_at: string;
  expires_at: string;
}

export interface ServiceAssignment {
  id: string;
  request_id: string;
  provider_id: string;
  status: AssignmentStatus;
  distance_km: number | null;
  eta_minutes: number | null;
  offered_at: string;
  responded_at: string | null;
}

export interface Payment {
  id: string;
  request_id: string;
  customer_id: string;
  provider_id: string;
  amount: number;
  currency: string;
  method: PaymentMethod | null;
  status: PaymentStatus;
  provider_rate: number;
  provider_amount: number;
  commission_amount: number;
  invoice_url: string | null;
  external_txn_id: string | null;
  created_at: string;
  paid_at: string | null;
}

export interface NearbyProvider {
  provider_id: string;
  distance_km: number;
  eta_minutes: number;
  rating: number;
}
