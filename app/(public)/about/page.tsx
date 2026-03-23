export default function AboutPage() {
  return (
    <div className="mx-auto max-w-4xl px-6 py-16">
      <h1 className="text-4xl font-bold text-primary">About Mountain Connect</h1>
      <p className="mt-4 text-lg text-foreground">
        Mountain Connect is the global platform connecting seasonal workers with
        ski resort businesses. We make it simple to find work, discover new
        resorts, and build a career in the mountains.
      </p>

      <section className="mt-12">
        <h2 className="text-2xl font-semibold text-primary">Our Mission</h2>
        <p className="mt-3 text-foreground">
          Every ski season, thousands of businesses need reliable staff, and
          thousands of workers are looking for their next mountain adventure.
          Mountain Connect bridges this gap with a streamlined platform that
          saves time for both sides.
        </p>
      </section>

      <section className="mt-12">
        <h2 className="text-2xl font-semibold text-primary">For Workers</h2>
        <ul className="mt-3 list-inside list-disc space-y-2 text-foreground">
          <li>Create a reusable profile with your full work history</li>
          <li>Apply to multiple jobs across different resorts instantly</li>
          <li>Discover resorts and regions you haven&apos;t considered before</li>
          <li>Track your applications in one place</li>
        </ul>
      </section>

      <section id="business" className="mt-12">
        <h2 className="text-2xl font-semibold text-primary">For Businesses</h2>
        <ul className="mt-3 list-inside list-disc space-y-2 text-foreground">
          <li>Post verified job listings visible to workers worldwide</li>
          <li>Browse worker profiles and reach out directly</li>
          <li>Manage applications and hiring from a single dashboard</li>
          <li>Build your reputation with a verified business profile</li>
        </ul>
      </section>

      <section id="contact" className="mt-12">
        <h2 className="text-2xl font-semibold text-primary">Contact Us</h2>
        <p className="mt-3 text-foreground">
          Have questions or want to partner with us? Reach out at{" "}
          <a
            href="mailto:hello@mountainconnect.com"
            className="text-primary underline hover:text-secondary"
          >
            hello@mountainconnect.com
          </a>
        </p>
      </section>
    </div>
  );
}
