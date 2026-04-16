"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import PortalHeader from "@/components/layout/PortalHeader";
import BusinessSidebar from "@/components/layout/BusinessSidebar";
import ChatUnreadProvider from "@/components/chat/ChatUnreadProvider";
import BugReportWidget from "@/components/ui/BugReportWidget";
import InactivityGuard from "@/components/auth/InactivityGuard";

export default function BusinessLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [userName, setUserName] = useState<string>("");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (
      !process.env.NEXT_PUBLIC_SUPABASE_URL ||
      !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    )
      return;
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      setUserName(data.user?.user_metadata?.full_name || "");
    });
  }, []);

  return (
    <ChatUnreadProvider>
      <div className="flex h-screen flex-col">
        <PortalHeader
          portalType="business"
          userName={userName}
          onMobileMenuToggle={() => setSidebarOpen(!sidebarOpen)}
        />
        <div className="flex flex-1 overflow-hidden">
          <BusinessSidebar
            mobileOpen={sidebarOpen}
            onMobileClose={() => setSidebarOpen(false)}
          />
          <main className="flex-1 overflow-y-auto bg-background p-4 sm:p-6">
            {children}
          </main>
        </div>
      </div>
      <BugReportWidget />
      <InactivityGuard />
    </ChatUnreadProvider>
  );
}
