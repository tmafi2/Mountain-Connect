import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service | Mountain Connects",
  description: "Terms and conditions for using the Mountain Connects platform.",
};

export default function TermsOfServicePage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <h1 className="text-3xl font-bold text-primary">Terms of Service</h1>
      <p className="mt-2 text-sm text-foreground/50">Last updated: 4 April 2026</p>

      <div className="mt-10 space-y-8 text-sm leading-relaxed text-foreground/70">
        <section>
          <h2 className="text-lg font-semibold text-primary">1. Acceptance of Terms</h2>
          <p className="mt-2">
            By accessing or using Mountain Connects (mountainconnects.com), you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use the platform.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-primary">2. About Mountain Connects</h2>
          <p className="mt-2">
            Mountain Connects is a platform that connects seasonal workers with businesses at ski resorts and mountain towns. We provide a marketplace for job listings, worker profiles, and communication between workers and employers. We do not act as an employer, employment agency, or recruiter.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-primary">3. Eligibility</h2>
          <p className="mt-2">You must be at least 16 years old to use Mountain Connects. By creating an account, you represent that:</p>
          <ul className="mt-2 list-disc space-y-1 pl-6">
            <li>You are at least 16 years of age</li>
            <li>You have the legal capacity to enter into these terms</li>
            <li>All information you provide is accurate and truthful</li>
            <li>You will maintain the accuracy of your information</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-primary">4. Account Types and Responsibilities</h2>
          <h3 className="mt-3 font-semibold text-primary">Workers</h3>
          <ul className="mt-2 list-disc space-y-1 pl-6">
            <li>You are responsible for the accuracy of your profile information, skills, and work history</li>
            <li>You must not misrepresent your qualifications, certifications, or experience</li>
            <li>You are responsible for ensuring you have the legal right to work in any country where you apply for jobs</li>
          </ul>
          <h3 className="mt-3 font-semibold text-primary">Businesses</h3>
          <ul className="mt-2 list-disc space-y-1 pl-6">
            <li>You must provide accurate business information and represent a legitimate business</li>
            <li>Job listings must be genuine and accurately describe the role, compensation, and conditions</li>
            <li>You must comply with all applicable employment laws in your jurisdiction</li>
            <li>Businesses are subject to a verification process before profiles and listings become publicly visible</li>
            <li>You must not post misleading, fraudulent, or discriminatory job listings</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-primary">5. Acceptable Use</h2>
          <p className="mt-2">You agree not to:</p>
          <ul className="mt-2 list-disc space-y-1 pl-6">
            <li>Use the platform for any unlawful purpose</li>
            <li>Post false, misleading, or fraudulent content</li>
            <li>Harass, abuse, or threaten other users</li>
            <li>Scrape, crawl, or use automated means to access the platform without permission</li>
            <li>Attempt to gain unauthorised access to other accounts or platform systems</li>
            <li>Use the platform to spam or send unsolicited communications</li>
            <li>Post content that infringes on intellectual property rights</li>
            <li>Upload malicious code, viruses, or harmful content</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-primary">6. Content</h2>
          <p className="mt-2">
            You retain ownership of content you post on Mountain Connects (profile information, photos, job listings). By posting content, you grant us a non-exclusive, worldwide, royalty-free licence to use, display, and distribute your content on the platform for the purpose of providing our services.
          </p>
          <p className="mt-2">
            We reserve the right to remove any content that violates these terms or that we deem inappropriate, at our sole discretion.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-primary">7. Business Verification</h2>
          <p className="mt-2">
            All businesses must undergo a verification process before their profiles and job listings become publicly visible. We reserve the right to approve, reject, or revoke verification at our discretion. Verification indicates that we have reviewed basic business information — it does not constitute an endorsement or guarantee of the business.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-primary">8. No Employment Relationship</h2>
          <p className="mt-2">
            Mountain Connects is a platform that facilitates connections between workers and businesses. We are not a party to any employment agreement, contract, or arrangement between users. We do not:
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-6">
            <li>Guarantee employment or hiring outcomes</li>
            <li>Verify the legal right to work of any worker</li>
            <li>Guarantee the accuracy of job listings or business information</li>
            <li>Mediate employment disputes</li>
            <li>Provide employment advice</li>
          </ul>
          <p className="mt-2">
            Users are responsible for conducting their own due diligence before entering into any employment arrangement.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-primary">9. Fees</h2>
          <p className="mt-2">
            Mountain Connects is currently free to use for both workers and businesses. We reserve the right to introduce paid features or subscription tiers in the future. Any changes to pricing will be communicated in advance.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-primary">10. Limitation of Liability</h2>
          <p className="mt-2">
            To the maximum extent permitted by law, Mountain Connects and its operators shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of the platform, including but not limited to:
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-6">
            <li>Loss of employment or business opportunities</li>
            <li>Disputes between workers and businesses</li>
            <li>Inaccurate information provided by other users</li>
            <li>Service interruptions or data loss</li>
            <li>Actions of third parties</li>
          </ul>
          <p className="mt-2">
            Nothing in these terms excludes or limits liability that cannot be excluded under Australian Consumer Law.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-primary">11. Disclaimer</h2>
          <p className="mt-2">
            The platform is provided &quot;as is&quot; and &quot;as available&quot; without warranties of any kind, either express or implied. We do not warrant that the platform will be uninterrupted, error-free, or secure.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-primary">12. Termination</h2>
          <p className="mt-2">
            We may suspend or terminate your account at any time for violation of these terms or for any reason at our discretion. You may delete your account at any time. Upon termination, your right to use the platform ceases immediately.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-primary">13. Changes to Terms</h2>
          <p className="mt-2">
            We may update these Terms of Service from time to time. We will notify you of material changes by posting the updated terms on this page. Your continued use of the platform after changes constitutes acceptance of the updated terms.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-primary">14. Governing Law</h2>
          <p className="mt-2">
            These terms are governed by the laws of New South Wales, Australia. Any disputes arising from these terms or your use of the platform shall be subject to the exclusive jurisdiction of the courts of New South Wales.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-primary">15. Contact Us</h2>
          <p className="mt-2">
            If you have any questions about these Terms of Service, please contact us at:
          </p>
          <p className="mt-2">
            <strong>Email:</strong> hello@mountainconnects.com
          </p>
        </section>
      </div>
    </div>
  );
}
