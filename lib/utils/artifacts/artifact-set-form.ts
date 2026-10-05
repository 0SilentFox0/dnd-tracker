import { ARTIFACT_SLOT_OPTIONS } from "@/lib/constants/artifacts";

export function formatArtifactSlotLabel(slot: string): string {
  return ARTIFACT_SLOT_OPTIONS.find((o) => o.value === slot)?.label ?? slot;
}

export function filterArtifactsSelectableForSet<
  T extends { id: string; setId?: string | null },
>(artifacts: T[], editingSetId: string | undefined): T[] {
  return artifacts.filter((a) => !a.setId || a.setId === editingSetId);
}
