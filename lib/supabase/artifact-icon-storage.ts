import { createAdminClient } from "@/lib/supabase/admin";

export const ARTIFACT_ICONS_BUCKET = "artifact-icons" as const;

const MAX_BYTES = 5 * 1024 * 1024;

function getExtensionFromUrl(url: string): string {
  try {
    const pathname = new URL(url).pathname;

    const match = pathname.match(/\.(png|jpg|jpeg|gif|webp|svg)(\?|$)/i);

    return match ? `.${match[1].toLowerCase()}` : ".png";
  } catch {
    return ".png";
  }
}

function getExtensionFromContentType(contentType: string | null): string {
  if (!contentType) return ".png";

  const map: Record<string, string> = {
    "image/png": ".png",
    "image/jpeg": ".jpg",
    "image/jpg": ".jpg",
    "image/gif": ".gif",
    "image/webp": ".webp",
    "image/svg+xml": ".svg",
  };

  return map[contentType.split(";")[0].trim().toLowerCase()] ?? ".png";
}

async function ensureBucket(
  supabase: ReturnType<typeof createAdminClient>,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const { data: buckets, error: listErr } = await supabase.storage.listBuckets();

  if (listErr) {
    return { ok: false, message: listErr.message };
  }

  if (buckets?.some((b) => b.name === ARTIFACT_ICONS_BUCKET)) {
    return { ok: true };
  }

  const { error } = await supabase.storage.createBucket(ARTIFACT_ICONS_BUCKET, {
    public: true,
  });

  if (error) {
    return { ok: false, message: error.message };
  }

  return { ok: true };
}

/** Вже на нашему Storage — не дзеркалимо повторно. */
export function isArtifactIconHostedOnProjectStorage(url: string): boolean {
  return url.includes("supabase.co/storage");
}

/** Потрібно завантажити з зовнішнього URL у бакет. */
export function shouldMirrorArtifactIconUrl(
  url: string | null | undefined,
): url is string {
  if (!url || typeof url !== "string") return false;

  const t = url.trim();

  if (!t.startsWith("http://") && !t.startsWith("https://")) return false;

  if (isArtifactIconHostedOnProjectStorage(t)) return false;

  return true;
}

/**
 * Завантажує зображення за URL у bucket artifact-icons.
 * Шлях: `{campaignId}/{objectBaseName}{ext}`
 */
export async function mirrorArtifactIconToSupabase(
  sourceUrl: string,
  options: { campaignId: string; objectBaseName: string },
): Promise<
  { ok: true; publicUrl: string } | { ok: false; message: string }
> {
  let supabase: ReturnType<typeof createAdminClient>;

  try {
    supabase = createAdminClient();
  } catch (e) {
    return {
      ok: false,
      message:
        e instanceof Error
          ? e.message
          : "Не налаштовано Supabase (URL або service role)",
    };
  }

  const ensured = await ensureBucket(supabase);

  if (!ensured.ok) {
    return { ok: false, message: ensured.message };
  }

  const res = await fetch(sourceUrl.trim(), {
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; DnD-Combat-Tracker/1.0)",
    },
    redirect: "follow",
  });

  if (!res.ok) {
    return {
      ok: false,
      message: `Не вдалося завантажити зображення (${res.status})`,
    };
  }

  const len = res.headers.get("content-length");

  if (len && parseInt(len, 10) > MAX_BYTES) {
    return { ok: false, message: "Файл завеликий (макс. 5 МБ)" };
  }

  const buffer = Buffer.from(await res.arrayBuffer());

  if (buffer.length > MAX_BYTES) {
    return { ok: false, message: "Файл завеликий (макс. 5 МБ)" };
  }

  const contentType = res.headers.get("content-type");

  const ctBase = contentType?.split(";")[0].trim().toLowerCase() ?? "";

  if (!ctBase.startsWith("image/")) {
    return { ok: false, message: "URL не вказує на зображення" };
  }

  const ext =
    getExtensionFromContentType(contentType) || getExtensionFromUrl(sourceUrl);

  const safeBase = options.objectBaseName.replace(/[^a-zA-Z0-9_-]/g, "");

  if (!safeBase) {
    return { ok: false, message: "Невалідне ім'я файлу" };
  }

  const fullPath = `${options.campaignId}/${safeBase}${ext}`;

  const { error: uploadError } = await supabase.storage
    .from(ARTIFACT_ICONS_BUCKET)
    .upload(fullPath, buffer, {
      contentType: contentType ?? "image/png",
      upsert: true,
    });

  if (uploadError) {
    return { ok: false, message: uploadError.message };
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from(ARTIFACT_ICONS_BUCKET).getPublicUrl(fullPath);

  return { ok: true, publicUrl };
}
