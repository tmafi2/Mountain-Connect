"use client";

import AdminSidebar from "@/components/layout/AdminSidebar";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen flex-col">
      {/* Admin header */}
      <header className="sticky top-0 z-50 flex h-14 items-center justify-between border-b border-accent bg-white/80 px-6 backdrop-blur-md">
        {/* Left — Logo */}
        <div className="flex items-center gap-2 text-lg font-bold text-primary">
          <svg
            width="24"
            height="24"
            viewBox="0 0 32 32"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden
          >
            <path d="M16 2L28 28H4L16 2Z" fill="#a9cbe3" />
            <path d="M16 10L24 28H8L16 10Z" fill="#0e2439" />
          </svg>
          Mountain Connect
          <span className="ml-2 rounded-md bg-red-100 px-2 py-0.5 text-xs font-bold uppercase tracking-wider text-red-700">
            Admin
          </span>
        </div>

        {/* Right — admin user */}
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-red-100 text-xs font-bold text-red-700">
            A
          </span>
          <span className="text-sm font-medium text-foreground">Admin</span>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <AdminSidebar />
        <main className="flex-1 overflow-y-auto bg-background p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
