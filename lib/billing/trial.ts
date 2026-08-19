/**
 * Trial constants, kept apart from lib/billing/stripe.ts on purpose.
 *
 * stripe.ts instantiates the Stripe SDK and reads server-only env vars, so
 * importing TRIAL_DAYS from there into a client component would pull the
 * whole SDK into the browser bundle. Client surfaces that only need to say
 * "30 days" import this instead; stripe.ts re-exports TRIAL_DAYS so server
 * callers keep working unchanged.
 */

/** Length of the free trial. Card is collected up front, charged at the end. */
export const TRIAL_DAYS = 30;

/**
 * How the trial is described to a buyer. 30 days reads as "a month" in
 * marketing copy, so say the number — "your first 30 days are free" can't be
 * misread the way "first month" can when their billing date lands mid-month.
 */
export const TRIAL_DAYS_LABEL = `${TRIAL_DAYS} days`;
