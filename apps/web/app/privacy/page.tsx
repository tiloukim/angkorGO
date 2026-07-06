import { LegalPage } from '../legal/legal';

export const metadata = { title: 'Privacy Policy — AngkorGo' };

export default function Privacy() {
  return (
    <LegalPage title="Privacy Policy" updated="July 2026">
      <p>
        AngkorGo (&quot;we&quot;, &quot;us&quot;) operates the AngkorGo platform — a multi-service marketplace in
        Cambodia offering rides, mobile auto repair, vehicle rentals, stays, and food delivery.
        This policy explains what we collect and how we use it.
      </p>

      <h2>Information we collect</h2>
      <ul>
        <li><strong>Account</strong>: name, email, phone number, preferred language, and role (customer, provider, host).</li>
        <li><strong>Location</strong>: precise GPS location to match you with nearby providers, show live tracking, and calculate routes and fares. Providers share location while on an active job.</li>
        <li><strong>Content</strong>: photos you upload (e.g. a vehicle problem, a listing), messages, and reviews.</li>
        <li><strong>Provider verification</strong>: identity documents, licenses, and vehicle details, used only for approval.</li>
        <li><strong>Payments</strong>: transaction amounts and status. Card/KHQR details are handled by our payment partners (ABA PayWay, Bakong KHQR, Stripe, Wing, ACLEDA); we do not store full card numbers.</li>
        <li><strong>Device</strong>: app version, device type, and push-notification token.</li>
      </ul>

      <h2>How we use it</h2>
      <ul>
        <li>Provide the services — matching, dispatch, live tracking, payments, and support.</li>
        <li>Verify providers and prevent fraud.</li>
        <li>Send notifications about your requests, trips, and bookings.</li>
        <li>Improve the platform and comply with legal obligations.</li>
      </ul>

      <h2>Sharing</h2>
      <p>
        We share the minimum necessary between the two sides of a transaction (e.g. a provider sees your
        pickup location and first name; you see their name, photo, rating, and vehicle). We use service
        providers (Supabase for data, Google Maps for routing, our payment partners, Expo for notifications).
        We do not sell your personal data.
      </p>

      <h2>Location &amp; background use</h2>
      <p>
        Location is used while you use the app. For providers, location may be collected in the background
        during an active job so customers can track their arrival; this stops when the job ends.
      </p>

      <h2>Data retention &amp; your rights</h2>
      <p>
        We keep your data while your account is active. You can access, correct, or export your data, and you
        can <strong>delete your account</strong> at any time from the app (Profile → Delete account) or by emailing
        us — this permanently removes your profile and associated data, subject to records we must retain by law.
      </p>

      <h2>Children</h2>
      <p>AngkorGo is not intended for anyone under 18.</p>

      <h2>Changes</h2>
      <p>We may update this policy and will post the new date above.</p>
    </LegalPage>
  );
}
