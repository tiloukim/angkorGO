import { LegalPage } from '../legal/legal';

export const metadata = { title: 'Terms of Service — AngkorGo' };

export default function Terms() {
  return (
    <LegalPage title="Terms of Service" updated="July 2026">
      <p>
        By using AngkorGo you agree to these terms. AngkorGo is a technology platform that connects customers
        with independent providers and hosts for rides, mobile auto repair, vehicle rentals, stays, and food
        delivery in Cambodia. We are a marketplace — providers and hosts are independent, not our employees.
      </p>

      <h2>Accounts</h2>
      <ul>
        <li>You must be 18+ and provide accurate information.</li>
        <li>You are responsible for activity under your account and for keeping it secure.</li>
        <li>Providers and hosts must pass verification before offering services.</li>
      </ul>

      <h2>Bookings, payments &amp; fees</h2>
      <ul>
        <li>Prices (fares, daily/nightly rates, service fees) are shown before you confirm.</li>
        <li>AngkorGo charges providers/hosts a service commission on completed transactions.</li>
        <li>Payments are processed by our partners (ABA PayWay, KHQR, Stripe, Wing, ACLEDA) or paid in cash where offered.</li>
        <li>Cancellations and deposits follow the policy shown at booking.</li>
      </ul>

      <h2>Conduct</h2>
      <p>
        Don&apos;t use the platform for anything illegal, don&apos;t misrepresent yourself, and treat other users
        respectfully. We may suspend accounts that violate these terms or our policies.
      </p>

      <h2>Provider &amp; host responsibilities</h2>
      <p>
        Providers and hosts are responsible for the legality, quality, safety, and insurance of the services and
        listings they offer, and for complying with applicable Cambodian law and licensing.
      </p>

      <h2>Disclaimers &amp; liability</h2>
      <p>
        The platform is provided &quot;as is&quot;. To the extent permitted by law, AngkorGo is not liable for the acts
        of independent providers/hosts or for indirect or consequential damages. Our aggregate liability is
        limited to the fees you paid us for the transaction in question.
      </p>

      <h2>Termination</h2>
      <p>You may stop using AngkorGo and delete your account at any time. We may suspend or terminate access for violations.</p>

      <h2>Contact</h2>
      <p>Questions about these terms: support@angkorgo.app.</p>
    </LegalPage>
  );
}
