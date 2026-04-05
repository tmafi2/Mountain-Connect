import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy | Mountain Connect",
  description: "How Mountain Connect collects, uses, and protects your personal information.",
};

export default function PrivacyPolicyPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <h1 className="text-3xl font-bold text-primary">Privacy Policy</h1>
      <p className="mt-2 text-sm text-foreground/50">Last updated: 5 April 2026</p>

      <div className="mt-10 space-y-8 text-sm leading-relaxed text-foreground/70">
        <section>
          <h2 className="text-lg font-semibold text-primary">1. Introduction</h2>
          <p className="mt-2">
            Mountain Connect (&quot;we&quot;, &quot;us&quot;, &quot;our&quot;) operates the website mountainconnects.com. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our platform. We are committed to protecting your privacy in accordance with the Australian Privacy Act 1988 (Cth) and the Australian Privacy Principles (APPs).
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-primary">2. Information We Collect</h2>
          <p className="mt-2">We collect information that you provide directly to us, including:</p>
          <ul className="mt-2 list-disc space-y-1 pl-6">
            <li><strong>Account information:</strong> Name, email address, password, and account type (worker or business)</li>
            <li><strong>Worker profile data:</strong> Bio, skills, work experience, availability, preferred job types, contact email, phone number, date of birth, nationality, visa status, profile photos, and uploaded resumes</li>
            <li><strong>Business profile data:</strong> Business name, description, industry, location, contact details, logo, cover photos, associated resort</li>
            <li><strong>Job listings:</strong> Job titles, descriptions, requirements, and application details</li>
            <li><strong>Applications:</strong> Application messages and status</li>
            <li><strong>Communications:</strong> Messages sent through our platform</li>
            <li><strong>Referral data:</strong> Referral codes and tracking of referred users</li>
          </ul>
          <p className="mt-3">We also collect information automatically:</p>
          <ul className="mt-2 list-disc space-y-1 pl-6">
            <li><strong>Usage data:</strong> Pages visited, features used, and interactions with the platform</li>
            <li><strong>Analytics data:</strong> We use Google Analytics 4 to collect anonymised usage statistics including page views, session duration, and device information</li>
            <li><strong>Cookies:</strong> Essential cookies for authentication and session management</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-primary">3. How We Use Your Information</h2>
          <p className="mt-2">We use your information to:</p>
          <ul className="mt-2 list-disc space-y-1 pl-6">
            <li>Provide, maintain, and improve the Mountain Connect platform</li>
            <li>Create and manage your account</li>
            <li>Connect workers with businesses and facilitate job applications</li>
            <li>Send transactional emails (account verification, application updates, interview notifications)</li>
            <li>Send optional newsletter updates (you can unsubscribe at any time)</li>
            <li>Display business profiles and job listings publicly to platform users</li>
            <li>Verify business registrations</li>
            <li>Analyse platform usage to improve our services</li>
            <li>Prevent fraud and ensure platform security</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-primary">4. How We Share Your Information</h2>
          <p className="mt-2">We may share your information with:</p>
          <ul className="mt-2 list-disc space-y-1 pl-6">
            <li><strong>Businesses (upon application):</strong> When you apply for a job, the hiring business can view your worker profile including your name, skills, experience, phone number, date of birth, nationality, visa status, cover letter, and uploaded resume. Businesses can only see profiles of workers who have applied to their job listings.</li>
            <li><strong>Public visibility:</strong> Verified business profiles and active job listings are publicly visible. Worker profiles are never publicly visible — they are only shared with businesses you apply to.</li>
            <li><strong>Service providers:</strong> We use third-party services to operate the platform:
              <ul className="mt-1 list-disc space-y-1 pl-6">
                <li>Supabase (database hosting and authentication)</li>
                <li>Resend (transactional emails)</li>
                <li>Vercel (website hosting)</li>
                <li>Google Analytics (anonymised usage analytics)</li>
              </ul>
            </li>
          </ul>
          <p className="mt-2">We do not sell your personal information to third parties.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-primary">5. Data Storage and Security</h2>
          <p className="mt-2">
            Your data is stored securely using Supabase, which provides enterprise-grade security including encryption at rest and in transit. Our database uses row-level security (RLS) policies to ensure users can only access data they are authorised to view.
          </p>
          <p className="mt-2">
            While we take reasonable steps to protect your information, no method of electronic transmission or storage is 100% secure. We cannot guarantee absolute security.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-primary">6. Your Rights</h2>
          <p className="mt-2">Under Australian privacy law, you have the right to:</p>
          <ul className="mt-2 list-disc space-y-1 pl-6">
            <li><strong>Access:</strong> Request a copy of the personal information we hold about you</li>
            <li><strong>Correction:</strong> Request that we correct any inaccurate or incomplete information</li>
            <li><strong>Deletion:</strong> Request that we delete your personal information and account. Account deletion removes all profile data, applications, job listings, notifications, newsletter subscriptions, and authentication credentials</li>
            <li><strong>Complaint:</strong> Lodge a complaint with the Office of the Australian Information Commissioner (OAIC) if you believe we have breached the APPs</li>
          </ul>
          <p className="mt-2">To exercise any of these rights, contact us at hello@mountainconnects.com.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-primary">7. Cookies</h2>
          <p className="mt-2">We use the following types of cookies:</p>
          <ul className="mt-2 list-disc space-y-1 pl-6">
            <li><strong>Essential cookies:</strong> Required for authentication and session management. These cannot be disabled.</li>
            <li><strong>Analytics cookies:</strong> Used by Google Analytics to collect anonymised usage data. You can opt out of these via our cookie consent banner.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-primary">8. Third-Party Links</h2>
          <p className="mt-2">
            Our platform may contain links to third-party websites (e.g., business websites, job application URLs). We are not responsible for the privacy practices of these external sites. We encourage you to review their privacy policies.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-primary">9. Children&apos;s Privacy</h2>
          <p className="mt-2">
            Mountain Connect is not intended for use by anyone under the age of 16. We do not knowingly collect personal information from children. If you believe a child has provided us with personal information, please contact us.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-primary">10. Changes to This Policy</h2>
          <p className="mt-2">
            We may update this Privacy Policy from time to time. We will notify you of any material changes by posting the updated policy on this page and updating the &quot;Last updated&quot; date. Your continued use of the platform after changes constitutes acceptance of the updated policy.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-primary">11. Contact Us</h2>
          <p className="mt-2">
            If you have any questions about this Privacy Policy or our data practices, please contact us at:
          </p>
          <p className="mt-2">
            <strong>Email:</strong> hello@mountainconnects.com
          </p>
        </section>
      </div>
    </div>
  );
}
