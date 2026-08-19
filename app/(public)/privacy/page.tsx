import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy | Mountain Connects",
  description: "How Mountain Connects collects, uses, and protects your personal information.",
};

export default function PrivacyPolicyPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <h1 className="text-3xl font-bold text-primary">Privacy Policy</h1>
      <p className="mt-2 text-sm text-foreground/50">Last updated: 19 August 2026</p>

      <div className="mt-10 space-y-8 text-sm leading-relaxed text-foreground/70">
        <section>
          <h2 className="text-lg font-semibold text-primary">1. Introduction</h2>
          <p className="mt-2">
            Mountain Connects (&quot;we&quot;, &quot;us&quot;, &quot;our&quot;) operates the website mountainconnects.com. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our platform.
          </p>
          <p className="mt-2">
            We are an Australian operation, and we apply the standards of the Australian Privacy Act 1988 (Cth) and the Australian Privacy Principles (APPs) to every user. Our workers and businesses are located worldwide, so where the law of your own country gives you stronger or additional rights, those apply to you as well. This includes the Personal Information Protection and Electronic Documents Act (PIPEDA) and provincial equivalents in Canada, the Act on the Protection of Personal Information (APPI) in Japan, and state privacy laws in the United States including the California Consumer Privacy Act as amended (CCPA/CPRA). Section 6 sets out how to exercise those rights and who to complain to in each region.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-primary">2. Information We Collect</h2>
          <p className="mt-2">We collect information that you provide directly to us, including:</p>
          <ul className="mt-2 list-disc space-y-1 pl-6">
            <li><strong>Account information:</strong> Name, email address, password, and account type (worker or business)</li>
            <li><strong>Worker profile data:</strong> Bio, skills, work experience, availability, preferred job types, contact email, phone number, date of birth, nationality, visa status, profile photos, and uploaded resumes</li>
            <li><strong>Business profile data:</strong> Business name, description, industry, location, contact details, logo, cover photos, associated resort</li>
            <li><strong>Billing information (paid plans only):</strong> Your selected plan, billing interval, subscription and trial status, renewal date, and the customer and subscription identifiers assigned by our payment processor. <strong>We never receive or store your card number.</strong> Card details are entered directly into Stripe&apos;s hosted checkout and billing portal and do not pass through our servers.</li>
            <li><strong>Job listings:</strong> Job titles, descriptions, requirements, and application details</li>
            <li><strong>Applications:</strong> Application messages and status</li>
            <li><strong>Communications:</strong> Messages sent through our platform</li>
            <li><strong>Interview data:</strong> Interview times, availability, timezone, and any notes a business or worker records against an interview. Interviews held on the platform use video rooms provided by Daily. We store the room reference and its expiry so the call can be joined — <strong>we do not record interviews</strong>, and rooms are configured without recording enabled.</li>
            <li><strong>Contracts and signatures:</strong> If a business issues a contract through the platform, we store the contract document, the signed copy, and your electronic signature.</li>
            <li><strong>Expressions of interest:</strong> If you register interest in a listing without creating an account, we store the name, email address, phone number, and message you submit, and pass them to the business once it claims the listing.</li>
            <li><strong>Support requests:</strong> The category, subject, and message you send us, along with your name, email, the page you were on, and your browser details.</li>
            <li><strong>Marketing and alerts:</strong> Newsletter and waitlist subscriptions, and any job alerts you set up, including the search filters they use.</li>
            <li><strong>Referral data:</strong> Referral codes and tracking of referred users</li>
          </ul>
          <p className="mt-3">We also collect information automatically:</p>
          <ul className="mt-2 list-disc space-y-1 pl-6">
            <li><strong>Usage data:</strong> Pages visited, features used, and interactions with the platform</li>
            <li><strong>Technical data:</strong> Your IP address and browser information. We record the IP address behind administrative actions in our audit log, we record your browser and operating system when you submit a support report, and we process IP addresses transiently for rate limiting and bot protection.</li>
            <li><strong>Analytics data:</strong> We use Google Analytics 4 to collect anonymised usage statistics including page views, session duration, and device information. This runs only if you accept analytics cookies.</li>
            <li><strong>Diagnostic data:</strong> When an error occurs, our error-monitoring provider may capture a recording of that session — the pages and elements involved in the fault — so we can reproduce it. Text content is masked by default, and sessions in which nothing goes wrong are not recorded.</li>
            <li><strong>Device and approximate location:</strong> If you tap or scan one of our physical contact cards, we record your device type, browser, and operating system, and the approximate location — country, region, city, timezone, and coordinates — that our hosting provider derives from your IP address. This is approximate and IP-based; it is not GPS, and we do not track your location as you move.</li>
            <li><strong>Cookies:</strong> Essential cookies for authentication and session management</li>
          </ul>

          <p className="mt-4"><strong>Information we collect from sources other than you.</strong> Not everything we hold was given to us by the person it describes. We also collect:</p>
          <ul className="mt-2 list-disc space-y-1 pl-6">
            <li><strong>Publicly posted job adverts.</strong> We collect job adverts that businesses have posted publicly in community groups and on social media in the regions we cover, and we may publish them on Mountain Connects as unclaimed listings. These hold the business name, location, role details, any contact address included in the original post, and a link back to it. If a listing about your business is here and you did not put it here, you can claim it or have it removed at any time — write to us using section 11 and we will take it down on request, without asking why.</li>
            <li><strong>Business contact details for outreach.</strong> We collect business email addresses so we can tell those businesses that the platform exists. Every such email carries a one-click unsubscribe link, and we stop on the first request.</li>
            <li><strong>Public posts from people looking for seasonal work.</strong> Where someone has publicly posted that they are seeking seasonal work in a region we cover, we may record that post, the name attached to it, and a link to it, so that we can let them know the platform exists. We do not build a profile from it and we do not combine it with anything else. You can ask us to delete yours at any time.</li>
          </ul>
          <p className="mt-2">
            We use an automated text-extraction service (Anthropic) to read these public posts and pull out structured details such as the role and the location. Where we hold information about you that did not come from you, you have exactly the same rights over it as an account holder does — see section 6 — and asking us to delete it is not conditional on having an account.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-primary">3. How We Use Your Information</h2>
          <p className="mt-2">We use your information to:</p>
          <ul className="mt-2 list-disc space-y-1 pl-6">
            <li>Provide, maintain, and improve the Mountain Connects platform</li>
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
            <li><strong>Businesses (upon application):</strong> When you apply for a job, the hiring business can view your worker profile including your name, skills, experience, phone number, date of birth, nationality, visa status, cover letter, and uploaded resume. A business can only see your profile if you have created a link to it yourself: you applied to one of its listings, or you followed it. Businesses cannot browse workers, search them, or message a worker who has not applied to them. Following a business is what makes you visible to that business, and unfollowing removes that access.</li>
            <li><strong>Public visibility:</strong> Verified business profiles and active job listings are publicly visible. Worker profiles are never publicly visible — no worker profile is reachable without signing in, and then only by a business you have applied to or followed.</li>
            <li><strong>Businesses claiming an imported listing:</strong> Where we have published an unclaimed listing collected from a public post (see section 2), an application you make to it is held until someone claims that listing, and is then released to them. We send the claim link only to the contact address on the original advert, but anyone holding that link can complete the claim. Unclaimed listings are labelled as unclaimed so you can decide whether to apply.</li>
            <li><strong>Service providers:</strong> We use third-party services to operate the platform:
              <ul className="mt-1 list-disc space-y-1 pl-6">
                <li>Supabase (database hosting and authentication)</li>
                <li>Resend (transactional emails)</li>
                <li>Vercel (website hosting)</li>
                <li>Google Analytics (anonymised usage analytics)</li>
                <li>Stripe (subscription payments and billing, for businesses on a paid plan)</li>
                <li>Sentry (error monitoring, diagnostics, and session recording when an error occurs)</li>
                <li>Daily (video interview rooms, when you take an interview on the platform)</li>
                <li>Cloudflare Turnstile (bot protection on sign-up, login, and password reset)</li>
                <li>Upstash (rate limiting, which processes IP addresses)</li>
                <li>Google Maps (map display on resort and town pages; these maps load whenever you open such a page)</li>
                <li>Anthropic (automated extraction of details from the public posts described in section 2)</li>
              </ul>
            </li>
          </ul>
          <p className="mt-2">
            If you subscribe to a paid plan, your payment details are collected and processed by Stripe under its own privacy policy rather than this one. Stripe acts as merchant of record for those transactions. We receive only the resulting subscription record — the plan, its status, and its renewal date — and never your card number or full billing details.
          </p>
          <p className="mt-2">We do not sell your personal information to third parties.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-primary">5. Data Storage, Security, and International Transfers</h2>
          <p className="mt-2">
            Your data is stored securely using Supabase, which provides enterprise-grade security including encryption at rest and in transit. Our database uses row-level security (RLS) policies to ensure users can only access data they are authorised to view.
          </p>
          <p className="mt-2">
            <strong>Where your data is held.</strong> Our primary database is hosted in the Asia Pacific (Seoul) region. Our website and application servers are operated by Vercel, and the service providers listed in section 4 process data on infrastructure of their own, which is generally located in the United States and the European Union. This means that if you are located in Australia, Canada, Japan, the United States, or elsewhere, your personal information will be transferred to and stored in countries other than your own, and may be accessible to those providers under the laws of the countries where they operate.
          </p>
          <p className="mt-2">
            We use these providers because they are established services with published security and privacy practices, and we share with them only what is needed to run the platform. By creating an account you consent to your information being transferred and processed in this way. If you would prefer that your data not be transferred internationally, we are not able to offer you an account, because there is no version of the platform that operates in a single country.
          </p>
          <p className="mt-2">
            Records of payments and subscriptions are kept for as long as we are required to keep them to meet our tax and accounting obligations. This can be longer than we retain other account data, including after an account is closed.
          </p>
          <p className="mt-2">
            Two other things outlive an account, and we would rather say so than let you find out. Our administrative audit log keeps a record of actions taken on accounts, along with the IP address behind them — that record is the point of having a log. And if a business issued you a contract through the platform, the signed PDF is stored under that business&apos;s records; closing your worker account removes our copy of the contract and your signature from our database, but not the employer&apos;s file. If either concerns you, ask us — section 6 applies to both.
          </p>
          <p className="mt-2">
            While we take reasonable steps to protect your information, no method of electronic transmission or storage is 100% secure. We cannot guarantee absolute security.
          </p>
          <p className="mt-2">
            <strong>If something goes wrong.</strong> If a data breach occurs that is likely to result in serious harm to you, we will notify you and the relevant regulator as required by the Notifiable Data Breaches scheme in Australia and the equivalent obligations in your own country. We will tell you what happened, what information was involved, and what you can do about it.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-primary">6. Your Rights</h2>
          <p className="mt-2">Wherever you are, you have the right to:</p>
          <ul className="mt-2 list-disc space-y-1 pl-6">
            <li><strong>Access:</strong> Request a copy of the personal information we hold about you</li>
            <li><strong>Correction:</strong> Request that we correct any inaccurate or incomplete information</li>
            <li><strong>Deletion:</strong> Request that we delete your personal information and account. Account deletion removes your profile data, applications, job listings, messages, interviews, notifications, newsletter subscriptions, authentication credentials, and the files you uploaded — profile photo, resume, cover letter, logo, and business photos are deleted from our storage, not merely unlinked. The exceptions are the ones named in section 5: payment and subscription records, which we must keep for tax and accounting purposes and which Stripe also retains independently of us; our administrative audit log; and any contract PDF held under an employer&apos;s records</li>
            <li><strong>Complaint:</strong> Complain to us first at hello@mountainconnects.com, and to your regulator if we do not resolve it</li>
          </ul>
          <p className="mt-2">To exercise any of these rights, contact us at hello@mountainconnects.com. We do not charge for this and we will not treat you differently for asking.</p>

          <p className="mt-4"><strong>Your regulator, by region:</strong></p>
          <ul className="mt-2 list-disc space-y-1 pl-6">
            <li><strong>Australia:</strong> Office of the Australian Information Commissioner (OAIC), if you believe we have breached the APPs</li>
            <li><strong>Canada:</strong> Office of the Privacy Commissioner of Canada, or your provincial commissioner where one has jurisdiction (including Quebec, British Columbia, and Alberta)</li>
            <li><strong>Japan:</strong> Personal Information Protection Commission (個人情報保護委員会)</li>
            <li><strong>United States:</strong> your state Attorney General. California residents also have the right under the CCPA/CPRA to know what personal information we collect and why, to request deletion or correction, and to opt out of the sale or sharing of personal information — we do not sell or share personal information, so there is nothing to opt out of, and we do not offer financial incentives in exchange for it</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-primary">7. Cookies</h2>
          <p className="mt-2">We use the following types of cookies:</p>
          <ul className="mt-2 list-disc space-y-1 pl-6">
            <li><strong>Essential cookies:</strong> Required for authentication and session management, and for the bot protection on sign-up, login, and password reset. These cannot be disabled.</li>
            <li><strong>Analytics cookies:</strong> Used by Google Analytics to collect anonymised usage data. These do not load at all unless you accept them, and you can decline them on our cookie consent banner.</li>
            <li><strong>Third-party embeds:</strong> Resort and town pages embed Google Maps, which loads from Google and may set its own cookies when you open one of those pages. It is not analytics and it is not covered by the banner. If you would rather it did not load, avoid those pages or block it in your browser.</li>
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
            Mountain Connects is not intended for use by anyone under the age of 16. We do not knowingly collect personal information from children. If you believe a child has provided us with personal information, please contact us.
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
