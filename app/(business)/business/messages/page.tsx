export default function BusinessMessagesPage() {
  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="text-2xl font-bold text-primary">Messages</h1>
      <p className="mt-1 text-sm text-foreground/60">
        Communicate with applicants and workers.
      </p>

      <div className="mt-8 rounded-xl border border-accent bg-white p-10 text-center">
        <svg
          className="mx-auto h-12 w-12 text-foreground/20"
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
        <h2 className="mt-4 text-lg font-semibold text-primary">
          No messages yet
        </h2>
        <p className="mt-2 text-sm text-foreground/60">
          Conversations with applicants will appear here once you start
          connecting.
        </p>
      </div>
    </div>
  );
}
