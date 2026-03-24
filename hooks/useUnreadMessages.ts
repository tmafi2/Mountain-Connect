"use client";

import { useContext } from "react";
import { ChatUnreadContext } from "@/components/chat/ChatUnreadProvider";

export function useUnreadMessages(): number {
  return useContext(ChatUnreadContext);
}
