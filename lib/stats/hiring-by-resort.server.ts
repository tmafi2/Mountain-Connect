import { createPublicClient } from "@/lib/supabase/public";
import { fetchAllRows } from "@/lib/supabase/fetch-all";
import { summarise, type ResortHiring } from "./hiring-by-resort";

/**
 * What is open at one resort, counted now.
 *
 * ⚠️ FAILS TO null, NEVER TO ZEROS. A resort page that said "0 roles open" on
 * a failed query would be worse than silent — it is a claim about the resort
 * rather than about us. The block renders nothing instead.
 */
export async function getHiringAtResort(resortUuid: string, resortName: string): Promise<ResortHiring | null> {
  if (!resortUuid) return null;
  try {
    const supabase = createPublicClient();
    // ⚠️ Must agree with lib/jobs/expired-gone.ts. The sweep runs once a day,
    // so a row can still say active while /jobs/<id> already answers 410.
    const notExpired = `expires_at.is.null,expires_at.gt.${new Date().toISOString()}`;
    const rows = await fetchAllRows<{
      category: string | null;
      business_id: string | null;
      accommodation_included: boolean | null;
      ski_pass_included: boolean | null;
      salary_range: string | null;
    }>(
      (from, to) =>
        supabase
          .from("job_posts")
          .select("category, business_id, accommodation_included, ski_pass_included, salary_range")
          .eq("status", "active")
          .eq("resort_id", resortUuid)
          .or(notExpired)
          .range(from, to),
      `hiring-by-resort:${resortName}`
    );
    if (rows.length === 0) return null;
    return summarise(resortName, rows);
  } catch (err) {
    console.error("hiring-by-resort: unavailable:", err);
    return null;
  }
}
