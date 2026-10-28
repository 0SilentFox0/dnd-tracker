import { InventoryLogKind } from "@/lib/constants/inventory";
import type { NotificationType } from "@/lib/constants/notifications";

export interface CharacterNotificationEvent {
  characterId: string;
  type: NotificationType;
  refId: string;
}

interface InventoryLogEntry {
  characterId: string;
  kind: string;
  delta: Record<string, unknown>;
}

function receivesArtifact(entry: InventoryLogEntry): boolean {
  if (entry.kind === InventoryLogKind.ARTIFACT_GRANT) return true;

  return entry.kind === InventoryLogKind.ARTIFACT_TRANSFER && "fromCharacterId" in entry.delta;
}

export function inventoryNotificationEvents(entries: InventoryLogEntry[]): CharacterNotificationEvent[] {
  const events: CharacterNotificationEvent[] = [];

  for (const entry of entries) {
    const artifactId = entry.delta.artifactId;

    if (receivesArtifact(entry) && typeof artifactId === "string") {
      events.push({ characterId: entry.characterId, type: "item", refId: artifactId });
    }
  }

  return events;
}

export function levelNotificationEvents(characterId: string, fromLevel: number, toLevel: number): CharacterNotificationEvent[] {
  if (toLevel <= fromLevel) return [];

  return [{ characterId, type: "level", refId: `${characterId}:${toLevel}` }];
}

export function spellNotificationEvents(
  characterId: string,
  before: unknown,
  after: readonly string[] | undefined,
): CharacterNotificationEvent[] {
  if (!after) return [];

  const known = new Set(Array.isArray(before) ? before : []);

  return [...new Set(after)].filter((id) => !known.has(id)).map((refId) => ({ characterId, type: "spell", refId }));
}
