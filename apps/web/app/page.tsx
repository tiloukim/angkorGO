import { redirect } from 'next/navigation';

// Root → dashboard. Middleware handles auth + admin-role gating.
export default function Home() {
  redirect('/dashboard');
}
