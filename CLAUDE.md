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
  migrations/  — 00001 through 00065 (sequential, run in Supabase SQL Editor)
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
- **Messaging:** Live — realtime conversations between workers and businesses. RLS policies, DB triggers, and unread-count hooks all wired up.
- **Nearby Towns:** Full feature — 50+ towns with detail pages, linked to resorts, job filtering by town
- **Interviews:** Functional — invite, book, reschedule, cancel, missed-interview detection.
- **Email notifications:** 30+ templates, Resend integration, branded masthead with logo + wordmark. Message notification trigger via DB.
- **Claim flow:** Admin-imported listings go live as unclaimed shells with a claim_token. Anonymous EOIs queue silently; first time aggregate EOIs hit 5 the business gets a nudge email; day-14 last-chance warning fires from cron; day-21 takedown flips active job posts to inactive. Cron: `/api/cron/unclaimed-dormancy-sweep`, daily 09:00 UTC.

## Migration Status
All migrations applied through **00069** (`fix_worker_profile_names` — backfills missing first/last names from auth metadata and creates worker_profiles for orphan OAuth signups). Next migration number: **00070**.

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
