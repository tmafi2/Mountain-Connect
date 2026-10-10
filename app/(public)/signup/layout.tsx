import type { Metadata } from "next";

export const metadata: Metadata = {
    // The root layout appends " | Mountain Connects" to every title; this
  // one already names the brand, so it opts out rather than saying it twice.
  title: { absolute: "Sign Up — Join Mountain Connects" },
  description:
    "Create your free Mountain Connects account. Find seasonal work at ski resorts or hire experienced mountain workers for your business.",
  alternates: { canonical: "https://www.mountainconnects.com/signup" },
};

export default function SignupLayout({ children }: { children: React.ReactNode }) {
  return children;
}
