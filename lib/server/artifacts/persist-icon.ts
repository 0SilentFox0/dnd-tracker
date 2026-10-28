import "server-only";
import { ContentError } from "@/lib/server/content/errors";
import { resolveArtifactIconForPersistence } from "@/lib/supabase/artifact-icon-storage";

export async function persistIcon(campaignId: string, icon: string | null, objectBaseName: string): Promise<string | null> {
  const resolved = await resolveArtifactIconForPersistence(icon, { campaignId, objectBaseName });

  if (!resolved.ok) throw new ContentError(resolved.message, 422);

  return resolved.value;
}
