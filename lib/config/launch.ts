/**
 * Launch Grace Period
 *
 * When true, every business gets Premium-level access for free and the
 * pricing page shows a "free during launch" holding view. Flipped to false
 * on 2026-08-16 when billing went live.
 *
 * Kept as a global kill-switch: setting this back to true instantly
 * restores free Premium access for everyone (e.g. if Stripe has an outage)
 * without touching any per-business state. Per-business courtesy windows
 * (business_profiles.grace_period_ends_at) are independent of this flag.
 */
export const LAUNCH_GRACE_PERIOD = false;
