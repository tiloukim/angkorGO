// Upload local image URIs to Supabase Storage and register the matching rows.
import { supabase } from './supabase';
import type { ImageKind } from '@angkorgo/shared';

type DocumentType = 'national_id' | 'drivers_license' | 'business_license' | 'vehicle_photo' | 'profile_photo';

// Read a local file URI into bytes for a Storage upload (RN has no Blob path).
async function readBytes(localUri: string): Promise<ArrayBuffer> {
  const res = await fetch(localUri);
  return res.arrayBuffer();
}

// Upload a provider verification document into provider-docs/{providerId}/…
// and register a provider_documents row (pending admin verification).
export async function uploadProviderDocument(
  providerId: string,
  type: DocumentType,
  localUri: string,
): Promise<string> {
  const path = `${providerId}/${type}_${Date.now()}.jpg`;
  const { error: upErr } = await supabase.storage
    .from('provider-docs')
    .upload(path, await readBytes(localUri), { contentType: 'image/jpeg', upsert: true });
  if (upErr) throw upErr;

  const { error: rowErr } = await supabase.from('provider_documents').insert({
    provider_id: providerId,
    type,
    file_url: path,
  });
  if (rowErr) throw rowErr;
  return path;
}

// Upload a vehicle photo into provider-docs/{providerId}/… → returns the path
// (stored on driver_vehicles.photo_url; no provider_documents row).
export async function uploadVehiclePhoto(providerId: string, localUri: string): Promise<string> {
  const path = `${providerId}/vehicle_${Date.now()}.jpg`;
  const { error } = await supabase.storage
    .from('provider-docs')
    .upload(path, await readBytes(localUri), { contentType: 'image/jpeg', upsert: true });
  if (error) throw error;
  return path;
}

// Upload a listing photo to the public `listings` bucket → returns a public URL.
export async function uploadListingPhoto(userId: string, localUri: string): Promise<string> {
  const path = `${userId}/${Date.now()}.jpg`;
  const { error } = await supabase.storage
    .from('listings')
    .upload(path, await readBytes(localUri), { contentType: 'image/jpeg', upsert: true });
  if (error) throw error;
  return supabase.storage.from('listings').getPublicUrl(path).data.publicUrl;
}

// Upload a parcel or proof-of-delivery photo to the public `parcels` bucket.
export async function uploadParcelPhoto(userId: string, localUri: string): Promise<string> {
  const path = `${userId}/${Date.now()}.jpg`;
  const { error } = await supabase.storage
    .from('parcels')
    .upload(path, await readBytes(localUri), { contentType: 'image/jpeg', upsert: true });
  if (error) throw error;
  return supabase.storage.from('parcels').getPublicUrl(path).data.publicUrl;
}

export const MAX_REQUEST_IMAGES = 10;

// Uploads one local file URI into request-images/{requestId}/{name}.jpg and
// inserts the matching service_request_images row. Returns the storage path.
export async function uploadRequestImage(
  requestId: string,
  localUri: string,
  index: number,
  kind: ImageKind = 'problem',
): Promise<string> {
  const path = `${requestId}/${Date.now()}_${index}.jpg`;

  const { error: upErr } = await supabase.storage
    .from('request-images')
    .upload(path, await readBytes(localUri), { contentType: 'image/jpeg', upsert: false });
  if (upErr) throw upErr;

  const { data: { user } } = await supabase.auth.getUser();
  const { error: rowErr } = await supabase.from('service_request_images').insert({
    request_id: requestId,
    image_url: path,
    kind,
    uploaded_by: user?.id,
  });
  if (rowErr) throw rowErr;

  return path;
}

export async function uploadRequestImages(requestId: string, uris: string[], kind: ImageKind = 'problem') {
  const capped = uris.slice(0, MAX_REQUEST_IMAGES);
  return Promise.all(capped.map((u, i) => uploadRequestImage(requestId, u, i, kind)));
}
