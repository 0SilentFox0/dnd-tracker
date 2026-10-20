import type { createAdminClient } from "@/lib/supabase/admin";

type Admin = ReturnType<typeof createAdminClient>;

type BucketOptions = Parameters<Admin["storage"]["createBucket"]>[1];

const ensured = new Set<string>();

export async function ensureBucket(
  supabase: Admin,
  bucket: string,
  options: BucketOptions = { public: true },
): Promise<{ ok: true } | { ok: false; message: string }> {
  if (ensured.has(bucket)) return { ok: true };

  const { data, error } = await supabase.storage.listBuckets();

  if (error) return { ok: false, message: error.message };

  if (!data?.some((b) => b.name === bucket)) {
    const created = await supabase.storage.createBucket(bucket, options);

    if (created.error) return { ok: false, message: created.error.message };
  }

  ensured.add(bucket);

  return { ok: true };
}
