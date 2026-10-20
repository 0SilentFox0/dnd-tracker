import { resolveImageForPersistence } from "@/lib/supabase/image-storage";

const ARTIFACT_ICONS_BUCKET = "artifact-icons";

/** Іконка артефакту або комплекту для БД (бакет artifact-icons). */
export function resolveArtifactIconForPersistence(
  icon: string | null,
  options: { campaignId: string; objectBaseName: string },
) {
  return resolveImageForPersistence(icon, { ...options, bucket: ARTIFACT_ICONS_BUCKET });
}
