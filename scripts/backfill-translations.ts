/**
 * Translate the adverts that were imported before translation existed.
 *
 * ⚠️ WHY A SCRIPT AND NOT A RE-SCRAPE. The ledger records a post as extracted
 * and will not pay for it twice — which is what makes the pipeline affordable,
 * and also means a schema change does not retroactively fill old rows. This
 * reads what is already stored and translates only that.
 *
 * ⚠️ IT CANNOT FIND ITS OWN WORK BY CHARSET. A non-Latin advert is detectable
 * with a regex; an Italian or French one is not — it looks exactly like
 * English. So the model is asked what language each advert is in, and the
 * answer is stored in post_language, which is the column that stops this
 * being guesswork next time.
 *
 * Read-only by default. Pass --apply to write.
 *
 *   npx tsx scripts/backfill-translations.ts [--apply] [--limit N]
 */
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";

for (const line of readFileSync(".env.local", "utf8").split("\n")) {
  const m = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
}

const APPLY = process.argv.includes("--apply");
const LIMIT = Number(process.argv[process.argv.indexOf("--limit") + 1]) || 50;

const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { persistSession: false },
});
const ai = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

const SYSTEM =
  "You are given the raw text of a job advert scraped from Facebook. Reply with JSON only: " +
  '{"language":"<ISO 639-1 code of the advert>","english":"<faithful English translation, or empty string if it is already English>"}. ' +
  "Translate, do not summarise and do not improve. Keep every pay figure, date, shift pattern, deadline, " +
  "phone number and email EXACTLY as written. Leave a term you are unsure of in the original with the " +
  "English in brackets. If the advert is already in English, set english to an empty string — a copy of " +
  "the original would be indistinguishable from a real translation.";

async function main() {
  const { data, error } = await db
    .from("job_posts")
    .select("id, title, description, post_language, description_en")
    .is("description_en", null)
    .not("description", "is", null)
    .limit(LIMIT);
  if (error) throw error;

  console.log(`${data!.length} listing(s) with no translation yet${APPLY ? "" : "  (dry run — pass --apply to write)"}\n`);
  let translated = 0, alreadyEnglish = 0, failed = 0;

  for (const job of data as { id: string; title: string; description: string }[]) {
    const text = (job.description ?? "").slice(0, 6000);
    if (!text.trim()) continue;
    try {
      const res = await ai.messages.create({
        model: "claude-opus-5",
        max_tokens: 2500,
        system: SYSTEM,
        messages: [{ role: "user", content: text }],
      });
      const raw = res.content.find((c) => c.type === "text")?.text ?? "";
      const json = JSON.parse(raw.slice(raw.indexOf("{"), raw.lastIndexOf("}") + 1));
      const language: string = String(json.language ?? "").toLowerCase().slice(0, 5);
      const english: string = String(json.english ?? "").trim();

      if (!english) {
        alreadyEnglish++;
        // ⚠️ post_language is still worth storing: it is what stops the next
        // run asking again, and "en" is an answer, not an absence.
        if (APPLY && language) await db.from("job_posts").update({ post_language: language }).eq("id", job.id);
        console.log(`  en   ${job.title.slice(0, 50)}`);
        continue;
      }
      translated++;
      console.log(`  ${language.padEnd(4)} ${job.title.slice(0, 44).padEnd(46)} -> ${english.slice(0, 60).replace(/\s+/g, " ")}…`);
      if (APPLY) {
        const { error: upErr } = await db
          .from("job_posts")
          .update({ post_language: language, description_en: english.slice(0, 5000) })
          .eq("id", job.id);
        if (upErr) { failed++; console.log(`       ! ${upErr.message}`); }
      }
    } catch (err) {
      failed++;
      console.log(`  !!   ${job.title.slice(0, 50)} — ${String(err).slice(0, 80)}`);
    }
  }

  console.log(`\n  ${translated} translated, ${alreadyEnglish} already English, ${failed} failed`);
  if (!APPLY) console.log("  nothing was written — pass --apply");
}

main();
