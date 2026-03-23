"use client";

import { Suspense } from "react";
import BookingContent from "./BookingContent";

export default function BookingPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[60vh] items-center justify-center">
          <p className="text-foreground/50">Loading...</p>
        </div>
      }
    >
      <BookingContent />
    </Suspense>
  );
}
