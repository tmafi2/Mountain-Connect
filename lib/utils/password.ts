export interface PasswordValidation {
  isValid: boolean;
  errors: string[];
  checks: {
    length: boolean;
    uppercase: boolean;
    lowercase: boolean;
    number: boolean;
    special: boolean;
  };
}

export function validatePassword(password: string): PasswordValidation {
  const checks = {
    length: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number: /\d/.test(password),
    special: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/.test(password),
  };

  const errors: string[] = [];
  if (!checks.length) errors.push("At least 8 characters");
  if (!checks.uppercase) errors.push("One uppercase letter");
  if (!checks.lowercase) errors.push("One lowercase letter");
  if (!checks.number) errors.push("One number");
  if (!checks.special) errors.push("One special character");

  return {
    isValid: Object.values(checks).every(Boolean),
    errors,
    checks,
  };
}

export const PASSWORD_REQUIREMENTS = [
  { key: "length", label: "At least 8 characters" },
  { key: "uppercase", label: "One uppercase letter" },
  { key: "lowercase", label: "One lowercase letter" },
  { key: "number", label: "One number" },
  { key: "special", label: "One special character (!@#$...)" },
] as const;
