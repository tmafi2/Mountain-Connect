import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Recursively delete everything under a storage prefix.
 *
 * WHY: the Privacy page promises that account deletion "removes all profile
 * data". The database side of /api/account/delete was doing that, but nothing
 * ever touched Storage — so a deleted worker's resume stayed in the `resumes`
 * bucket, and their profile photo stayed in `avatars`, which is a PUBLIC
 * bucket. That left a deleted user's face retrievable at a stable,
 * unauthenticated URL indefinitely.
 *
 * Storage.list() is not recursive, and our paths nest — venue assets live at
 * `{businessId}/venues/{venueId}/logo.png` — so we walk. Entries with a null
 * `id` are folders (Supabase synthesises them from object name prefixes);
 * entries with an id are real objects.
 *
 * Best-effort by design: deletion of the account must not fail because a
 * bucket is missing or a remove() 500s. We log and continue, because leaving
 * the auth user alive is worse than leaving an orphaned file to be swept.
 */
export async function purgeStoragePrefix(
  bucket: string,
  prefix: string
): Promise<number> {
  const admin = createAdminClient();
  let deleted = 0;

  const walk = async (dir: string): Promise<string[]> => {
    const { data, error } = await admin.storage
      .from(bucket)
      .list(dir, { limit: 1000 });

    if (error || !data) {
      if (error) {
        console.error(`purgeStoragePrefix: list ${bucket}/${dir} failed:`, error.message);
      }
      return [];
    }

    const paths: string[] = [];
    for (const entry of data) {
      const full = dir ? `${dir}/${entry.name}` : entry.name;
      if (entry.id === null) {
        paths.push(...(await walk(full)));
      } else {
        paths.push(full);
      }
    }
    return paths;
  };

  try {
    const paths = await walk(prefix);
    if (paths.length === 0) return 0;

    // remove() caps out on very large batches; chunk defensively.
    for (let i = 0; i < paths.length; i += 100) {
      const batch = paths.slice(i, i + 100);
      const { error } = await admin.storage.from(bucket).remove(batch);
      if (error) {
        console.error(`purgeStoragePrefix: remove in ${bucket} failed:`, error.message);
      } else {
        deleted += batch.length;
      }
    }
  } catch (err) {
    console.error(`purgeStoragePrefix: ${bucket}/${prefix} threw:`, err);
  }

  return deleted;
}
