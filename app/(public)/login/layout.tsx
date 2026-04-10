import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Log In | Mountain Connects",
  description: "Log in to your Mountain Connects account to manage your profile, applications, and job listings.",
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return children;
}
