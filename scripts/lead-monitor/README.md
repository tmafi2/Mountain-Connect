# Lead monitor — Supabase side

Storage and dedup for the lead monitor: posts collected from ski-region
community groups where someone says they're looking for seasonal work.

This directory is **only** the storage half — the dedup key, a CLI to read
keys back out, and a CLI to write collected posts in. The collector that
walks a Facebook page is a separate thing; this provides the hash function it
needs so its keys match ours exactly.

```
dedup-key.ts           canonical dedup key (Node)
dedup-key.browser.js   twin of the above, paste-safe for a page context
dedup-key.test.ts      runs shared fixtures through both, asserts equality
fixtures.ts            the shared fixtures + pinned regression hashes
common.ts              env loading, credentials, PostgREST client
fetch-keys.ts           CLI: read dedup_keys back out
ingest.ts               CLI: write collected posts in
```

Table: `public.lead_posts`, created by
`supabase/migrations/00086_lead_posts.sql`.

---

## ⚠️ The service key must never reach the browser

`dedup-key.browser.js` runs **in Facebook's page context**. Every other
script on that page — Facebook's own, any extension you have installed — can
read anything in scope there. A Supabase service-role key pasted into that
context is a key you have to rotate.

The service key bypasses RLS on **every table in the project**, not just this
one. Leaking it exposes worker profiles, applications, messages and billing
rows.

So the loop is deliberately split:

```
1. terminal  │ fetch-keys --region Canada   → JSON array of keys we already have
2. clipboard │ paste that array into your collector snippet
3. browser   │ snippet collects posts, skips keys in the array, emits JSON
4. terminal  │ ingest --file that.json      → writes to Supabase
```

The browser never talks to Supabase. Only steps 1 and 4 hold credentials, and
both run in your shell. `dedup-key.test.ts` enforces this: it fails if the
browser file ever contains a JWT, a `service_role` reference, or any way to
make a network call at all.

---

## Setup

Credentials come from `.env.local` (already gitignored) or the real
environment. Two spellings are accepted for each — the documented name wins,
the second is what this repo already uses:

| Purpose | Accepted variables (in precedence order) |
|---|---|
| Project URL | `SUPABASE_URL`, then `NEXT_PUBLIC_SUPABASE_URL` |
| Service key | `SUPABASE_SERVICE_KEY`, then `SUPABASE_SERVICE_ROLE_KEY` |

Your existing `.env.local` already satisfies both via the second column, so
there's nothing to add.

It has to be the **service role** key: `lead_posts` has RLS enabled with zero
policies, so an anon key doesn't error — it silently returns nothing. The CLI
rejects a key it can positively identify as anon/publishable for that reason.

Apply the migration:

```bash
npx supabase db push --dry-run && npx supabase db push
```

---

## Usage

### Tests

```bash
npm run test:lead-monitor
```

### `fetch-keys` — read keys back out

```bash
npx tsx scripts/lead-monitor/fetch-keys.ts --region Canada
npx tsx scripts/lead-monitor/fetch-keys.ts --region Japan --days 30
```

| Flag | Default | Meaning |
|---|---|---|
| `--region` | required | `Canada`, `USA`, `Japan`, `Australia` (aliases like `usa`, `united states`, `au` accepted) |
| `--days` | `90` | look-back window |

**stdout is only the JSON array.** Counts and warnings go to stderr, so it
pipes cleanly:

```bash
npx tsx scripts/lead-monitor/fetch-keys.ts --region Canada | pbcopy
npx tsx scripts/lead-monitor/fetch-keys.ts --region Canada > keys.json
```

The window filters on `created_at` — when *we* recorded the lead — not
`date_posted`, which is nullable. Results are paged internally; Supabase caps
responses at 1000 rows and truncates silently, which would otherwise make
every older lead look unseen.

### `ingest` — write collected posts in

```bash
npx tsx scripts/lead-monitor/ingest.ts --file leads.json --dry-run   # offline, writes nothing
npx tsx scripts/lead-monitor/ingest.ts --file leads.json
```

**stdout is only the number of rows inserted**, so `COUNT=$(… ingest.ts
--file x.json)` works. The readable summary goes to stderr.

`--dry-run` parses, dedups and reports without writing, and doesn't need
credentials at all — use it to validate a payload before it goes near the
database.

What it does to the payload:

- **Recomputes every dedup key** from `(group name, a, t)`. A key supplied in
  the payload is ignored — the browser snippet is the least trustworthy link
  in the chain, and a key from a stale snippet would insert a duplicate the
  database can't catch.
- **Skips posts with no text.** They carry no lead, and every empty one would
  hash identically for a given group+author and collapse into one row.
- **Truncates stored text to 500 code points.** (The key only ever sees the
  first 120.)
- **Never guesses a date.** Unparseable timestamps are stored as `null` and
  reported. Only epoch seconds/ms and ISO-8601-shaped strings are accepted;
  arbitrary strings are *not* handed to `Date.parse`, because V8 turns
  `"August 15"` into `2001-08-15` — inventing a year nobody supplied.
  Timestamps without a zone are read as UTC.
- **Dedups locally first**, then upserts with
  `on_conflict=dedup_key` and `Prefer: resolution=ignore-duplicates,return=representation`,
  so the response contains only genuinely-inserted rows.
- Never deletes or updates anything. A colliding post is ignored, not
  overwritten.

---

## Input format

```json
{
  "region": "Canada",
  "groups": [
    {
      "name": "Whistler Ski Season Jobs 2026",
      "posts": [
        {
          "a": "Alex Rivera",
          "t": "Looking for seasonal work in Whistler from November — lift ops or hospitality.",
          "u": "https://facebook.com/groups/…/posts/1",
          "d": "2026-08-15T10:23:00Z",
          "ty": "Seeking Work",
          "rc": "Lift Operations",
          "av": "Nov 2026 – Apr 2027",
          "lang": "en"
        }
      ]
    }
  ]
}
```

| Field | Column | Required | Notes |
|---|---|---|---|
| `region` (top level) | `region` | yes | one of the four; aliases accepted |
| `name` (per group) | `source_group` | yes | part of the dedup key |
| `a` | `poster_name` | — | author |
| `t` | `post_content` | effectively | post text; empty ⇒ post skipped |
| `u` | `post_url` | — | permalink |
| `d` | `date_posted` | — | epoch or ISO-8601; anything else ⇒ `null` |
| `ty` | `post_type` | — | `Seeking Work` (default) / `Hiring` / `Unknown` |
| `rc` | `role_category` | — | free text |
| `av` | `availability` | — | free text |
| `lang` | `language` | — | BCP-47-ish tag; unrecognised ⇒ `en` |

`status`, `date_found`, `created_at` and `id` are left to database defaults.
Every row is sent with an identical key set, which PostgREST requires for
bulk inserts — it derives the column list from the first object in the array.

---

## The dedup key

FNV-1a 64-bit, hex, 16 chars, over the UTF-8 bytes of:

```
normalise(group) + "|" + normalise(poster) + "|" + truncate(normalise(text), 120)
```

`normalise` = collapse whitespace runs to one space, trim, lowercase.
`truncate` counts **code points**, applied after normalising, so it never
splits an emoji or a CJK character.

Not cryptographic, on purpose — it's a dedup key, not a security boundary.
`node:crypto` doesn't exist in a page context and `SubtleCrypto` is async and
unavailable on non-secure origins, so both are unusable here.

### Changing it is a data migration

`dedup_key` is the only thing stopping every historical post from
re-inserting. Change any step — the separator, normalisation order,
truncation unit, the hash — and every existing row is orphaned: nothing
matches again and the whole table re-inserts as fresh leads.

`fixtures.ts` pins two known hashes for exactly this reason, and the failure
message says not to "fix" the test. If the algorithm genuinely has to change,
recompute `dedup_key` for every existing row in the same deploy.

The two implementations are twins and must stay byte-identical. **Edit both
or neither** — the test loads `dedup-key.browser.js` from disk and evaluates
it the way a browser would, so drift fails loudly rather than silently
producing two key spaces.

### Group name is part of the key

The same person posting the same text in two different groups produces **two
rows**, because `source_group` is hashed in. That's per the key's definition,
and `ingest` reports how many such look-alikes it saw so you can judge the
noise.

If you'd rather collapse them, the group has to come out of the hash — which
is the data migration described above, and it also means you'd lose which
group a lead first came from.

---

## What's in this table, and who can read it

Nobody, by default. RLS is on with **zero policies**, so anon, authenticated,
workers, businesses and admins are all denied; only the service key gets in.
The migration also revokes the default table grants as a second layer.

Worth keeping in mind: unlike every other table in this schema, the people in
here never signed up. The rows are personal data about third parties — name,
what they wrote, a link back to them — collected from public posts across
four jurisdictions (PIPEDA, APPI, the Australian Privacy Act, and GDPR for
any EU citizen who posts). Recruitment sourcing is a recognised legitimate
interest in most of them, but that generally assumes a deletion path and a
retention limit, and this schema currently has neither.

Two things worth adding before the table gets big:

- a `deleted_at` column plus an honoured deletion request path
- a retention sweep that drops `rejected` / untouched `new` rows after N days

Also note automated collection is against Facebook's terms of service, and
account-level enforcement is the usual consequence.
