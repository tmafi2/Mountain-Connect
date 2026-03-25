"use client";

import { Suspense } from "react";
import ChatProvider from "@/components/chat/ChatProvider";
import MessagingLayout from "@/components/chat/MessagingLayout";

function MessagesContent() {
  return (
    <ChatProvider>
      <MessagingLayout portalType="worker" />
    </ChatProvider>
  );
}

export default function WorkerMessagesPage() {
  return (
    <div className="h-full rounded-2xl overflow-hidden border border-accent/40 bg-white shadow-sm">
      <Suspense
        fallback={
          <div className="flex h-full items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-primary" />
          </div>
        }
      >
        <MessagesContent />
      </Suspense>
    </div>
  );
}
