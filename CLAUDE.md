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
  migrations/  — sequential; applied with `supabase db push` (CLI linked to prod project kafekhemktqoczxclthy; history reconciled 2026-08-16, `db push --dry-run` = up to date). Falls back to SQL Editor if CLI unavailable.
```

## Supabase Patterns
- **User-scoped client** (`createClient` from server.ts or client.ts): respects RLS, use for user-facing reads
- **Admin client** (`createAdminClient` from admin.ts): bypasses RLS, use for cross-user operations (notifications, conversations, admin actions)
- **RLS is enforced** on all tables. Admin policies in migration 00011. **Verified by probe on 2026-08-19**, not merely asserted: anonymous callers, plus throwaway authenticated worker and business accounts with no relationships, were pointed at all 24 sensitive tables and at storage. Everything user-scoped returned 0 rows (`worker_profiles`, `applications`, `messages`, `interviews`, `contracts`, `audit_logs`, `outreach_leads`, `support_reports`, `login_otp_codes`, `expressions_of_interest`, `nfc_taps`, …); `users` returns the caller's own row only; `business_profiles` and `job_posts` are public by design. Storage: an authenticated stranger cannot list the resumes/contracts/documents buckets, cannot list another user's folder, and cannot sign another user's file, while public buckets still serve. **Two exceptions found:** `conversation_participants` raises 42P17 (infinite recursion) so it has NO working policy — it fails closed, and the app only works because `/api/conversations` uses the admin client throughout; and `lead_posts` returns 403 by design (no policy, service-role only). Re-run the probe after any policy change — and note that RLS also lives in dashboard-created policies that never appear in `supabase/migrations/` (see 00090), so reading the migration files is not a substitute.
- **Realtime** enabled on `messages` table only

## Key Database Tables
- `users` — auth users with role (worker, business_owner, admin)
- `worker_profiles` — worker details, skills, availability, contact_email
- `business_profiles` — business details, verification_status, resort_id, nearby_town_id (source of truth for where the business is — trumps the resort link; auto-stamped from `location` text by trigger added in 00074. Legacy `operates_in_town` flag kept for backward compat but no longer gates display logic)
- `business_venues` — establishments under each business (added in 00076). One row per venue, with name/slug/description/location/resort_id/nearby_town_id/logo/cover/contact + an `is_primary` boolean (one primary per business, partial unique index). The primary venue mirrors the business's own data and is auto-created for every existing/new business. Verification is at the business level, not per-venue.
- `job_posts` — listings with nearby_town_id, venue_id (FK to business_venues, nullable for backward compat but populated for every active job since 00076), how_to_apply, application_email/url
- `applications` — worker applications to jobs
- `interviews` — scheduling with status (invited, scheduled, completed, cancelled, missed, reschedule_requested)
- `resorts` — 70 resorts with legacy_id text field for backward compat (UNIQUE constraint on legacy_id added in 00072)
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
- **Messaging:** Live — realtime conversations between workers and businesses. RLS policies, DB triggers, and unread-count hooks all wired up.
- **Business Venues:** Live — single business owners can list multiple establishments (e.g. a pub AND a bar) under one account, each with its own location/resort/town/logo/cover photo. Manage at `/business/venues`. Job posting offers a venue dropdown only when the business has 2+ venues. Public business pages (`/business/{id}`) render a "Venues" section when applicable, and each venue has its own URL (`/business/{id}/{venue-slug}`). Job listings and emails (application, interview, alert match) surface "{Venue} ({Business})" when a job is at a non-primary venue, falling back to just the business name otherwise. Worker follows + reviews are still business-scoped per the design call. Admin sees the venue list on `/admin/businesses`.
- **Nearby Towns:** Full feature — 50+ towns with detail pages, linked to resorts, job filtering by town
- **Interviews:** Functional — invite, book, reschedule, cancel, missed-interview detection.
- **Email notifications:** 30+ templates, Resend integration, branded masthead with logo + wordmark. Message notification trigger via DB.
- **Claim flow:** Admin-imported listings go live as unclaimed shells with a claim_token. Anonymous EOIs queue silently. Nudge cadence (each gated by its own sent-at column, so at most one of each fires): first EOI ever → first-applicant email; aggregate EOIs hit 5 → 5-applicant nudge; day-14 last-chance warning fires from cron; day-21 takedown flips active job posts to inactive. Cron: `/api/cron/unclaimed-dormancy-sweep`, daily 09:00 UTC. **Claim-time tier gate (00087):** we import one listing per ROLE, so one post can become a dozen job posts. At claim the claimant picks which listing stays live and the rest are parked (`status='paused'` + `paused_reason='claim_gated'`) — nothing is deleted, and applications/EOIs stay attached. The limit is the claimant's *effective* tier, not a hardcoded 1, so a shell inside the 00080 courtesy window keeps everything live and sees no picker. Both entry points are gated: `/api/claim/complete` (with the picker) and `/api/signup/claim-imports` (no picker — keeps the newest). `lib/billing/job-parking.ts` owns park + restore; `restoreParkedJobs` runs from `lib/billing/sync.ts` on upgrade and only ever touches rows WE parked, never a listing the owner paused. The dashboard shows the parked count plus the EOIs waiting on them as the upgrade prompt. Tests: `npm run test:billing`.
- **Billing / paid plans:** **LIVE since 2026-08-16.** `lib/tier.ts` holds the rate card (Standard $39/mo · $149/season-pass, Premium $79/mo · $299/season-pass = *founding* rates; full rates $49/$219 and $99/$440 shown struck through; a season pass = a fixed 6-month term, see `SEASON_PASS_*` constants; founding pricing closes 2027-04-30 and is grandfathered while continuously subscribed; free tier = 1 live job post). `resolveEffectiveTier()` derives the tier a business gets from its billing row (global `LAUNCH_GRACE_PERIOD` kill-switch → per-business `grace_period_ends_at` courtesy window → live subscription's `selected_tier` → admin enterprise → free). The 27 pre-billing businesses have a courtesy window until 2026-10-15. Trial = 30 days of the plan they picked (not premium-for-all), card up front. ⚠️ **The trial-ending reminder is NOT sent by this codebase.** `/api/billing/webhook` handles `customer.subscription.trial_will_end` but deliberately only syncs state — the email comes from Stripe's built-in reminder, a toggle at Dashboard → Settings → Billing → Subscriptions and emails. It is not readable via the Stripe API (`/v1/account` does not expose it), so nothing in this repo can verify or test it. If it is ever switched off, businesses are charged at day 30 with no warning and there is no code-level symptom. Re-check it after any Stripe dashboard change, and if trial reminders are ever reported missing, look there FIRST rather than in the webhook. Job-post limits are enforced **server-side** via `POST /api/business/jobs` + `lib/billing/post-gate.ts` (drafts never gated; publish-drafts respects the limit). Stripe (LIVE, USD, Managed Payments on = Stripe is merchant of record): `lib/billing/stripe.ts`, `/api/billing/checkout`, `/api/billing/portal`, `/api/billing/webhook` → `lib/billing/sync.ts` (idempotent re-fetch; downgrade rule pauses jobs over limit newest-first, never deletes). `scripts/stripe-setup.ts` is idempotent and creates products/prices/coupons per mode. **Kill-switch:** set `LAUNCH_GRACE_PERIOD=true` in `lib/config/launch.ts` + deploy → free Premium for everyone, no per-business state touched. Courtesy email to pre-billing businesses: `scripts/send-paid-plans-announcement.ts` (dry-run default) — Tyler sends it himself.
- **Employer landing pages:** `/for-employers` + `/for-employers/{canada,japan,usa,australia}` (`lib/data/employer-markets.ts` = the live markets only; non-live slugs 404). Business-facing mirror of `/ski-resort-jobs/{country}`; pricing pulled from `PRICING`. Stats only render when positive (resort/town counts always; business/job counts once ≥5/≥3). **Still live** — not to be confused with `/employers` below.
- **Employer directory (`/employers`): HIDDEN since 2026-08-30.** `EMPLOYERS_DIRECTORY_ENABLED` in `lib/config/features.ts` is the single switch — set it to `true` and deploy to restore; nothing was deleted. It was hidden because the directory lists every `business_profiles` row and 88 of 99 were unverified import shells, so it read as 89% placeholders. While false: the route calls `notFound()` *before* its queries, and the header nav, footer, `/welcome` footer, both business-page breadcrumbs, `sitemap.xml` and `robots.txt` all drop it. `/business/{id}` is unaffected and is where the directory linked anyway, so no business lost its page. Note `/employers/{slug}` (worker portal, seed data, linked from `/following`) is a *separate* legacy route and is still live.
- **Location requests:** "Missing your resort/town? Let us know" — `components/ui/LocationRequestForm` in all resort pickers' no-results state, explore empty state, and the employer hub → `POST /api/location-requests` (public, rate-limited, honeypot) → `location_requests` table + email to ADMIN_NOTIFY_EMAIL. Use it to decide which regions to open next.
- **Work eligibility (worker ↔ business):** `lib/work-eligibility.ts` is the single source — VisaStatus taxonomy, per-country visa *programmes* (AU 417/462, CA IEC, US J-1/H-2B, JP WH/Designated Activities…), country normalisation ("USA" ≡ "United States"), and `resolveEligibilityFor(profile, country)`. Workers record per-country status (+ optional programme + expiry) in `worker_profiles.work_authorizations` JSONB. **Business views always resolve for the JOB's resort country** via `components/ui/EligibilityBadge` (applicants inbox, manage-listings/[id], interview sidebar; workers/[id] shows a per-country table) — never the legacy `visa_status` column, which only reflects the first country added. Apply form shows a soft nudge if the worker has no eligibility listed for the job's country (`/profile/edit?step=eligibility`). We capture STATUS only — never visa/passport numbers or documents; right-to-work verification is the employer's job at hire.

## Migration Status
Latest migration: **00093** (`job_post_expiry_schema` — Phase 1 of automatic job-post expiry. Adds `published_at`, `expires_at`, `auto_renew`, `expiry_warning_sent_at`, `expired_notice_sent_at` to `job_posts`, adds `'expired'` to the `paused_reason` CHECK, and installs the `job_posts_stamp_expiry` BEFORE INSERT OR UPDATE trigger. **Nothing user-visible changes yet** — no cron reads these columns, nothing is paused, no email is sent. THE CLOCK STARTS AT APPROVAL, not creation: the trigger stamps on the transition INTO `status='active'`, so an admin review backlog never eats a business's window, and an ordinary edit while active does NOT extend it. A caller that supplies its own `expires_at` keeps it. A trigger rather than call-site stamping because FOUR paths set status=active (`POST /api/business/jobs`, `lib/admin/publish-jobs.ts`, `/api/cron/publish-scheduled`, and `restoreParkedJobs`). ⚠️ The 56-day window is a literal in the trigger AND `JOB_POST_LIFESPAN_DAYS` in `lib/jobs/expiry.ts` — changing one requires changing the other. Backfilled all 98 active posts with a fresh window from the apply date (guarded on `published_at IS NULL`) so switching the cron on later cannot mass-pause the board. All 7 trigger cases were tested in a rolled-back prod transaction before applying.) Before that, **00092** (`retire_stale_spring_listings` — one-off: paused the 32 job posts created March–June 2026 that were still live in late August, with `paused_reason='stale_cleanup'` and no notification. Businesses keep them — manage-listings has no status filter — and the 90 attached applications are untouched. **This migration REQUIRED a code change to be safe:** `restoreParkedJobs`/`countParkedJobs` matched on `paused_reason IS NOT NULL`, so a non-billing reason would have been silently republished on the next plan upgrade. Both now match `BILLING_PAUSE_REASONS` (`claim_gated`, `tier_downgrade`) in `lib/billing/job-parking.ts`, covered by two regression tests confirmed to fail against the old matching.) Before that, **00091** (`norquay_replaces_banff_lake_louise` — repoints legacy_id 11 from the composite "Banff / Lake Louise" record to Mount Norquay alone.) Before that, **00090** (`storage_policies_bucket_scope` — 🔴 fixes a LIVE data exposure. Two sets of dashboard-created policies on `storage.objects` (`1oj01fe_*`, `flreew_*`) had no `bucket_id` predicate, and storage RLS is a disjunction — so `"Anyone can view avatars"` (qual `true`, role `public`) granted ANONYMOUS read of every object in every PRIVATE bucket: resumes, documents, contracts. Three more granted any authenticated user INSERT/UPDATE/DELETE across all buckets. Verified against prod before and after: anon listing of resumes/documents/contracts went 5+/1/1 entries → 0/0/0, public buckets and service role unaffected.) Before that, **00089** (`contracts_storage_party_scope` — scopes contract FILE reads to the issuing business and the contract's worker via SECURITY DEFINER `can_read_contract_file()`, replacing 00055's `auth.role() = 'authenticated'` blanket grant, and drops the unused authenticated INSERT grant since both writers use the admin client. NOTE: 00089 alone did nothing — 00090's blanket policy overrode it. Both are required.) Before that, **00088** (`import_outreach_sent_at` — gates the import/claim outreach email per BUSINESS rather than per published job, matching the sent-at pattern every other email in the cadence already had.) Before that, **00087** (`job_pause_reason` — adds `job_posts.paused_reason` (NULL | 'claim_gated' | 'tier_downgrade') so a paused row records WHY. NULL keeps its existing meaning, "the owner paused it", which is what makes auto-restore-on-upgrade safe: without the marker, restoring every paused job would silently re-publish roles the owner had filled. Partial index on (business_id, paused_reason) WHERE NOT NULL. Applied via `supabase db push`.) Before that, **00080** (`billing_subscriptions` — adds Stripe/subscription columns to `business_profiles`: stripe_customer_id, stripe_subscription_id, subscription_status, selected_tier, billing_interval, trial_ends_at, current_period_end, is_founding_member, grace_period_ends_at, billing_updated_at, with CHECKs + partial indexes; stamps every existing business with a 60-day premium courtesy window, guarded by IS NULL so re-runs never extend anyone. Validated with a real PG parser). Before that, **00079** (`towns_for_new_resorts` — seeds 16 full-detail nearby towns and 18 resort links for the 21 resorts from the 00075 batch that had none: Japan 92–102, USA 103–106, Canada 107–108. Morioka and Hachimantai City each serve two resorts; Palisades Tahoe gets Olympic Valley primary + Truckee secondary. Idempotent, validated with a real PG parser). All prior migrations applied through **00078** (`swap_primary_venue_rpc` — adds an RPC the venues page calls to atomically flip the primary venue in a single UPDATE, replacing the previous two-step pattern that could leave the business primary-less if the second write failed. SECURITY DEFINER with an explicit owner/admin check). 00077 added three venue safeguards (auto-create primary venue trigger, venue↔business validation trigger, ON DELETE SET NULL on job_posts.venue_id). 00076 introduced business venues. 00075 added 38 new resorts. 00074 added the auto-resolve trigger that stamps `business_profiles.nearby_town_id` from the location text. 00073 added the `outreach_leads` and `outreach_sends` tables for the admin email-campaign feature. Next migration number: **00094**. (00086 `lead_posts` — FB/social lead capture, see scripts/lead-monitor.) (00084 `location_requests` — "Missing your resort/town?" request table. 00085 `worker_profile_visibility` — businesses can only SELECT worker profiles they have a relationship with (applied / conversation / follow) via SECURITY DEFINER `business_can_view_worker()`; matches the Privacy page. Inline subqueries recurse — keep the function.) (00083 `paid_plans_notice_sent` — first migration applied via `supabase db push`.) (00081/00082 are `worker_contact_email` and `fix_thredbo_perisher_banners`, renumbered from duplicate 00032/00034 slots on 2026-08-16 — same SQL, long since applied; renamed only so every version is unique for the Supabase CLI.)

Apply migrations with `supabase db push` (always `--dry-run` first). When adding a schema-touching migration, dry-run it against a fresh `supabase db reset` (or branch DB) before merging — recent dedup work needed three follow-up commits to fix text/UUID cast errors that would have surfaced locally.

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


## Notion import pipeline (managed by Cowork)

This section documents the automated social media → Notion → Mountain Connects import pipeline. It is maintained by the Cowork agent. Do not edit manually — changes will be overwritten on the next Cowork session.

---

### Notion database IDs

| Database | Data Source ID |
|---|---|
| Job Posts (raw Facebook captures) | `0bec452f-3acd-46df-8ae4-0c99a05fb7c1` |
| MC Import Listings (staging for import) | `4d3a647a-5b13-4670-8ff3-6bdb79c418ca` |

Both databases live on the Notion page: **🏔️ Snowy Mountains Job Monitor**

---

### MC Import Listings → API field mappings

When pushing a listing from Notion to the `/api/admin/job-listings/import` endpoint, map Notion columns to API fields as follows:

| Notion Column | API Field | Notes |
|---|---|---|
| Business Name | `businessName` | Title field — always present |
| Job Title | `jobTitle` | Omit if blank |
| Description | `description` | Up to 500 chars |
| Location | `location` | e.g. "Jindabyne, NSW" |
| Country | `country` | Always "Australia" |
| Business Email | `businessEmail` | Omit if blank |
| Application Email | `applicationEmail` | Omit if blank |
| Original Post URL | `sourceUrl` | Source Facebook post permalink |
| Source | `source` | Facebook group name — see source-name registry below |
| Date Posted (date:Date Posted:start) | `datePosted` | ISO 8601 date string of original post |
| Page ID | `notionId` | Always include — used to update the Notion record after push |
| Resort (inferred) | `resortName` | Canonical resort name (see normalisation rules); required unless a UUID `resortId` is sent instead. Omit if resort cannot be determined. |

Fields intentionally never sent: Category, Employment Type, Housing Included, Season Start, Season End, Requirements, MC Listing URL.

---

### Sync status — which column marks a record as synced

The **Status** column on MC Import Listings is the single source of truth for sync state:

| Status value | Meaning |
|---|---|
| `📋 To Import` | Ready to push — will be included in the next push run |
| `✅ Imported` | Successfully pushed to MC; `MC Listing URL` field is populated |
| `⚠️ Has Account` | Business already has an MC account — do not push |

**After a successful push:** set Status → `✅ Imported` and populate `MC Listing URL` with the URL returned by the API.  
**After a failed push:** leave Status as `📋 To Import` and prepend `⚠️ Push failed: <error>` to the Description field.  
**Never push** records with Status `✅ Imported` or `⚠️ Has Account`.

---

### Push task — schedule and error handling

The push task (`push-mc-job-listings`) is **ad-hoc** (manual trigger only, no cron). Tyler triggers it by saying *"push new job listings"* in a Cowork session.

**Error handling rules:**
- On **401 Unauthorized** → stop the entire batch immediately and report that the API key may be invalid
- On **4xx (other)** → log the error against that listing, continue to the next
- On **5xx / network error** → retry once after 5 seconds; if it fails again, log and continue
- On **partial batch failure** → report which listings succeeded and which failed; do not re-attempt succeeded ones

**API credentials** are stored at:  
`/Users/tylermafi/Documents/Claude/Mountain Connects - social/mc_api_config.json`

---

### Source-name registry

The `source` field sent to the API must exactly match one of these canonical names. These also correspond to the Facebook groups the monitor scans:

```
Jindabyne Notice Board
Jindabyne Job Guide
Thredbo Job Guide
Snowy Mountain Uncensored
Looking to live around Jindabyne
Thredbo Notice Board
```

Do not abbreviate, translate, or reformat these. If a source value in Notion doesn't match the list (e.g. a previously appended cross-post note like "Jindabyne Notice Board → also: Jindabyne Job Guide"), extract only the first group name (before the `→`) as the canonical source.

---

### Resort-name normalisation

The `resortName` API field must be one of these canonical values:

| Canonical value | Maps from |
|---|---|
| `Perisher` | "Perisher Valley", "Perisher Blue", "Perisher FoodWorks", posts mentioning Perisher ski resort |
| `Thredbo` | "Thredbo Alpine Village", "Thredbo Resort", posts from Thredbo groups or mentioning Thredbo |
| `Smiggins` | "Smiggins Holes", "Smiggins Hotel", posts mentioning Smiggins |
| `Jindabyne` | Posts based in Jindabyne town with no specific resort mentioned |
| `Both` | Posts that explicitly service or recruit for both Perisher and Thredbo |

If resort cannot be determined from the post content or group context, omit `resortName` entirely — do not guess.

---

### Deduplication rule (MC Import Listings)

Before creating a new MC Import Listings entry, check for an existing record where:
1. `Business Email` matches (case-insensitive) **OR** `Business Name` matches (case-insensitive)
2. **AND** `Job Title` matches (case-insensitive), or both entries have a blank Job Title
3. **AND** `Date Posted` is within the last **21 days**

If all three match → do not create a new record. Instead append the new source group to the existing record's `Source` field:  
`"Jindabyne Notice Board → also: Jindabyne Job Guide"`

After 21 days → treat as a fresh listing regardless of business/role match.
