"use client";

import Link from "next/link";

export default function WorkerProfilePage() {
  return (
    <div className="mx-auto max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-primary">My Profile</h1>
          <p className="mt-1 text-sm text-foreground/60">
            Manage your worker profile, skills, and preferences.
          </p>
        </div>
        <Link
          href="/profile-setup-test"
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary/90"
        >
          Edit Profile
        </Link>
      </div>

      <div className="mt-8 rounded-xl border border-accent bg-white p-8 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-secondary/20">
          <svg className="h-8 w-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        </div>
        <h2 className="mt-4 text-lg font-semibold text-primary">
          Your profile is 30% complete
        </h2>
        <p className="mt-2 text-sm text-foreground/60">
          A complete profile helps employers find you and increases your chances
          of getting hired.
        </p>
        <div className="mt-4 h-2 w-full rounded-full bg-accent/30">
          <div className="h-2 w-[30%] rounded-full bg-secondary" />
        </div>
        <Link
          href="/profile-setup-test"
          className="mt-6 inline-block rounded-lg bg-primary px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary/90"
        >
          Complete Your Profile
        </Link>
      </div>
    </div>
  );
}
