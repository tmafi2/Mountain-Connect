"use client";

import { validatePassword, PASSWORD_REQUIREMENTS } from "@/lib/utils/password";

interface PasswordStrengthProps {
  password: string;
}

export default function PasswordStrength({ password }: PasswordStrengthProps) {
  if (!password) return null;

  const { checks } = validatePassword(password);
  const passed = Object.values(checks).filter(Boolean).length;
  const total = PASSWORD_REQUIREMENTS.length;

  return (
    <div className="mt-2 space-y-2">
      {/* Strength bar */}
      <div className="flex gap-1">
        {Array.from({ length: total }).map((_, i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full transition-colors ${
              i < passed
                ? passed <= 2
                  ? "bg-red-400"
                  : passed <= 4
                  ? "bg-yellow-400"
                  : "bg-green-500"
                : "bg-gray-200"
            }`}
          />
        ))}
      </div>

      {/* Requirements checklist */}
      <div className="space-y-1">
        {PASSWORD_REQUIREMENTS.map((req) => {
          const met = checks[req.key as keyof typeof checks];
          return (
            <p
              key={req.key}
              className={`flex items-center gap-1.5 text-xs transition-colors ${
                met ? "text-green-600" : "text-foreground/40"
              }`}
            >
              {met ? (
                <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              )}
              {req.label}
            </p>
          );
        })}
      </div>
    </div>
  );
}
