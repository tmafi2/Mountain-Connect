"use client";

import Link from "next/link";
import Image from "next/image";

export default function SignupConfirmationPage() {
  return (
    <div className="relative flex min-h-screen">
      {/* Left — mountain image panel */}
      <div className="relative hidden w-1/2 lg:block">
        <Image
          src="https://images.unsplash.com/photo-1519681393784-d120267933ba?w=1200&q=80"
          alt="Snowy mountain peaks"
          fill
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-r from-primary/80 via-primary/50 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-primary/60 via-transparent to-primary/30" />

        <div className="relative z-10 flex h-full flex-col justify-between p-12">
          <Link href="/" className="flex items-center gap-3">
            <Image src="/images/logo-source.png" alt="Mountain Connects" width={40} height={40} className="rounded-lg" />
            <span className="text-xl font-bold text-white">Mountain Connects</span>
          </Link>

          <div className="max-w-md">
            <h2 className="text-4xl font-extrabold leading-tight text-white">
              Almost there!
              <br />
              <span className="text-secondary">Check your inbox.</span>
            </h2>
            <p className="mt-4 text-base text-white/70">
              We&apos;ve sent a confirmation email to verify your account.
              Once verified, you&apos;ll be ready to start your mountain adventure.
            </p>
          </div>

          <p className="text-xs text-white/30">
            &copy; {new Date().getFullYear()} Mountain Connects
          </p>
        </div>
      </div>

      {/* Right — confirmation message */}
      <div className="flex w-full items-center justify-center px-6 lg:w-1/2">
        <div className="w-full max-w-md text-center">
          {/* Mobile logo */}
          <div className="mb-8 flex items-center justify-center gap-2 lg:hidden">
            <Image src="/images/logo-source.png" alt="Mountain Connects" width={32} height={32} className="rounded-lg" />
            <span className="text-lg font-bold text-primary">Mountain Connects</span>
          </div>

          {/* Email icon */}
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-secondary/10">
            <svg className="h-10 w-10 text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
            </svg>
          </div>

          <h1 className="mt-6 text-3xl font-extrabold text-primary">
            Confirmation email sent!
          </h1>

          <p className="mt-4 text-sm leading-relaxed text-foreground/60">
            We&apos;ve sent a verification email to your inbox.
            Please click the link in the email to verify your account.
          </p>

          <div className="mt-8 rounded-xl border border-accent bg-accent/10 p-5">
            <div className="flex items-start gap-3">
              <svg className="mt-0.5 h-5 w-5 shrink-0 text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
              </svg>
              <div className="text-left">
                <p className="text-sm font-semibold text-primary">What to do next:</p>
                <ol className="mt-2 space-y-1.5 text-sm text-foreground/60">
                  <li className="flex items-start gap-2">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-secondary/10 text-[10px] font-bold text-secondary">1</span>
                    Check your email inbox (and spam folder)
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-secondary/10 text-[10px] font-bold text-secondary">2</span>
                    Click the verification link in the email
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-secondary/10 text-[10px] font-bold text-secondary">3</span>
                    Come back and log in to get started
                  </li>
                </ol>
              </div>
            </div>
          </div>

          <Link
            href="/login"
            className="mt-8 inline-flex w-full items-center justify-center rounded-xl bg-primary py-3 text-sm font-bold text-white shadow-lg shadow-primary/20 transition-all hover:bg-primary/90 hover:shadow-xl hover:shadow-primary/25"
          >
            Go to Login
          </Link>

          <p className="mt-6 text-xs text-foreground/40">
            Didn&apos;t receive the email? Check your spam folder or{" "}
            <Link href="/signup" className="font-medium text-secondary hover:underline">
              try signing up again
            </Link>
            .
          </p>
        </div>
      </div>
    </div>
  );
}
