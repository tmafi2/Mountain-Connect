# Mountain Connect

Seasonal worker platform connecting workers with ski resort businesses worldwide.

## Tech Stack
- **Framework:** Next.js 15 (App Router), React 19, TypeScript 5
- **Database:** Supabase (PostgreSQL + Auth + Realtime + Storage)
- **Email:** Resend (templates in `lib/email/templates/`, send functions in `lib/email/send.ts`)
- **Styling:** Tailwind CSS 4, custom colors in `app/globals.css`
- **Maps:** @react-google-maps/api
- **Other:** canvas-confetti, date-fns, react-globe.gl

## Project Structure
```
app/
  (public)/    — Public pages (homepage, explore, jobs, resorts, towns, signup, login)
  (worker)/    — Worker portal (dashboard, profile, applications, interviews, saved-jobs)
  (business)/  — Business portal (dashboard, post-job, manage-listings, applicants, interviews)
  (admin)/     — Admin portal (dashboard, businesses, workers, jobs, registrations, verification)
  api/         — 36 API routes

lib/
  supabase/    — client.ts (browser), server.ts (server components), admin.ts (service role), middleware.ts
  email/       — send.ts + templates/ (13 email templates)
  data/        — resorts.ts (static resort data), region-hierarchy.ts, jobs.ts
  notifications/ — create.ts (createNotification helper)

components/
  layout/      — Header, Footer, AdminSidebar, PortalHeader, RegionsDropdown
  chat/        — NewConversationModal, StartConversationButton, ChatUnreadProvider
  ui/          — NotificationBell, NotificationDropdown, ResortMap, Map

supabase/
  migrations/  — 00001 through 00033 (sequential, run in Supabase SQL Editor)
```

## Supabase Patterns
- **User-scoped client** (`createClient` from server.ts or client.ts): respects RLS, use for user-facing reads
- **Admin client** (`createAdminClient` from admin.ts): bypasses RLS, use for cross-user operations (notifications, conversations, admin actions)
- **RLS is enforced** on all tables. Admin policies in migration 00011.
- **Realtime** enabled on `messages` table only

## Key Database Tables
- `users` — auth users with role (worker, business_owner, admin)
- `worker_profiles` — worker details, skills, availability, contact_email
- `business_profiles` — business details, verification_status, resort_id, operates_in_town
- `job_posts` — listings with nearby_town_id, how_to_apply, application_email/url
- `applications` — worker applications to jobs
- `interviews` — scheduling with status (invited, scheduled, completed, cancelled, missed, reschedule_requested)
- `resorts` — 69 resorts with legacy_id text field for backward compat
- `nearby_towns` — 50+ towns with 30+ detail fields
- `resort_nearby_towns` — many-to-many join
- `conversations`, `conversation_participants`, `messages` — messaging system
- `notifications` — in-app notifications with types
- `saved_jobs`, `job_alerts` — worker features

## Business Registration Flow
Businesses can post listings regardless of verification state. Verification is a trust signal, not a gate.
1. Sign up (with resort selection) → email confirmation
2. Onboarding creates business_profiles with `verification_status: "pending_review"`
3. Business can immediately create + publish active job listings (previously draft-only). Their jobs and profile are publicly visible right away.
4. Admin reviews at `/admin/registrations` → approve/reject/request info
5. On verification: status → "verified", green "Verified" badge appears on their profile + job listings + the employers directory; celebration shown
6. Unverified businesses still show publicly but with an amber "Not yet verified" note on their profile page so workers know the business hasn't been vetted
7. Admins can verify/unverify any business at any time from `/admin/businesses`

## Current Feature Status
- **Messaging:** Disabled — shows "Coming Soon" placeholder. Backend code preserved but has RLS race condition issues. DB tables and triggers exist.
- **Nearby Towns:** Full feature — 50+ towns with detail pages, linked to resorts, job filtering by town
- **Interviews:** Functional — invite, book, reschedule, cancel. Missed interview detection needs migration 00032.
- **Email notifications:** 13 templates, Resend integration. Message notification trigger (migration 00031).

## Migration Status
Next migration number: **00034**
Note: There are two 00032 files (interview_missed_reschedule and worker_contact_email). Check which have been run.

## Important Conventions
- Resort `id` in database is UUID. Static data uses `legacy_id` (text: "1", "2", etc.)
- Resort FK lookups in migrations: `(SELECT id FROM resorts WHERE legacy_id = '52' LIMIT 1)`
- Town slugs are lowercase hyphenated: "whistler-village", "hirafu-kutchan"
- `snow_reliability` CHECK constraint: only "high", "medium", "low" (NOT "moderate")
- Email from address: `Mountain Connect <notifications@mountainconnects.com>`
- Site has an access gate (cookie `site-access=granted`) — middleware redirects to /access without it

## Colors
- Primary: #0a1e33 (dark navy)
- Secondary: #3b9ede (bright blue)
- Highlight: #22d3ee (cyan)
- Warm: #f59e0b (amber)
- Background: #f5f7fa
- Foreground: #3d4f5f
- Accent: #c8d5e0
