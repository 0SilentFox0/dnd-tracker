export function filterArtifactsSelectableForSet<
  T extends { id: string; setId?: string | null },
>(artifacts: T[], editingSetId: string | undefined): T[] {
  return artifacts.filter((a) => !a.setId || a.setId === editingSetId);
}
