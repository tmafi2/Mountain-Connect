import { notFound } from "next/navigation";

// Test mode is development-only (see middleware.ts), so outside it this page
// would ask for a code that unlocks nothing.
export default function TestPortalsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (process.env.NODE_ENV !== "development") notFound();
  return <>{children}</>;
}
