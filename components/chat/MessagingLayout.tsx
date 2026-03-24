"use client";

import { useCallback, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  ChannelList,
  Channel,
  MessageList,
  MessageInput,
  Thread,
  Window,
  useChatContext,
} from "stream-chat-react";
import type { Channel as StreamChannel } from "stream-chat";
import CustomChannelPreview from "./CustomChannelPreview";

interface MessagingLayoutProps {
  portalType: "worker" | "business";
}

export default function MessagingLayout({ portalType }: MessagingLayoutProps) {
  const { client } = useChatContext();
  const searchParams = useSearchParams();
  const channelParam = searchParams.get("channel");

  const [activeChannel, setActiveChannel] = useState<StreamChannel | null>(null);
  const [showChannelList, setShowChannelList] = useState(true);

  const handleChannelSelect = useCallback(
    (channel: StreamChannel) => {
      setActiveChannel(channel);
      // On mobile, hide list when a channel is selected
      setShowChannelList(false);
    },
    []
  );

  const handleBack = useCallback(() => {
    setShowChannelList(true);
  }, []);

  const userId = client.userID;

  // Filter: only channels where the current user is a member
  const filters = {
    type: "messaging" as const,
    members: { $in: [userId!] },
  };
  const sort = { last_message_at: -1 as const };
  const options = { limit: 20, presence: true, state: true };

  // Auto-select channel from URL param
  const customActiveChannel = channelParam && !activeChannel
    ? client.channel("messaging", channelParam)
    : activeChannel || undefined;

  return (
    <div className="flex h-full overflow-hidden rounded-xl border border-accent/30 bg-white">
      {/* Channel List — sidebar */}
      <div
        className={`w-full shrink-0 border-r border-accent/30 md:w-80 ${
          showChannelList ? "block" : "hidden md:block"
        }`}
      >
        <div className="flex h-14 items-center border-b border-accent/30 px-4">
          <h2 className="text-sm font-bold text-primary">Messages</h2>
        </div>
        <div className="h-[calc(100%-3.5rem)] overflow-y-auto">
          <ChannelList
            filters={filters}
            sort={sort}
            options={options}
            Preview={CustomChannelPreview}
            setActiveChannelOnMount={!channelParam}
            customActiveChannel={customActiveChannel?.id}
            showChannelSearch
          />
        </div>
      </div>

      {/* Message Thread — main area */}
      <div
        className={`flex-1 ${
          showChannelList ? "hidden md:flex md:flex-col" : "flex flex-col"
        }`}
      >
        {activeChannel || customActiveChannel ? (
          <Channel channel={customActiveChannel || activeChannel!}>
            <Window>
              {/* Mobile back button */}
              <div className="flex h-14 items-center gap-3 border-b border-accent/30 px-4 md:hidden">
                <button
                  onClick={handleBack}
                  className="rounded-lg p-1.5 text-foreground/50 hover:bg-accent/20 hover:text-foreground"
                >
                  <svg
                    className="h-5 w-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 19l-7-7 7-7"
                    />
                  </svg>
                </button>
                <span className="text-sm font-bold text-primary">Back</span>
              </div>
              <MessageList />
              <MessageInput focus />
            </Window>
            <Thread />
          </Channel>
        ) : (
          <div className="flex h-full items-center justify-center">
            <div className="text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-accent/30">
                <svg
                  className="h-8 w-8 text-foreground/30"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                  />
                </svg>
              </div>
              <p className="mt-4 text-sm font-medium text-foreground/50">
                Select a conversation to start messaging
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
