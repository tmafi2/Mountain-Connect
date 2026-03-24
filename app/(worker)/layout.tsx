"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import PortalHeader from "@/components/layout/PortalHeader";
import WorkerSidebar from "@/components/layout/WorkerSidebar";
import ChatUnreadProvider from "@/components/chat/ChatUnreadProvider";

export default function WorkerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [userName, setUserName] = useState<string>("");

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
        <PortalHeader portalType="worker" userName={userName} />
        <div className="flex flex-1 overflow-hidden">
          <WorkerSidebar />
          <main className="flex-1 overflow-y-auto bg-background p-6">
            {children}
          </main>
        </div>
      </div>
    </ChatUnreadProvider>
  );
}
