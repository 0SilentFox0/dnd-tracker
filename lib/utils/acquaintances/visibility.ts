import { byName } from "@/lib/utils/common/text";
import type { PlayedLookup } from "@/lib/utils/scenario/reveal";
import type { AcquaintanceEntryView, AcquaintanceKind, AcquaintanceNoteView, AcquaintanceView } from "@/types/acquaintances";

export interface AcquaintanceRecord {
  id: string;
  campaignId: string;
  kind: string;
  characterId: string | null;
  name: string;
  avatarUrl: string | null;
  description: string;
  sourcePageId: string;
  sourceSectionId: string;
  character: { name: string; avatar: string | null; background?: string | null } | null;
  entries: { id: string; pageId: string; sectionId: string; text: string; sortOrder: number; createdAt: Date }[];
  notes: { id: string; authorUserId: string; text: string; updatedAt: Date; author: { displayName: string } }[];
}

interface Viewer {
  userId: string;
  isDM: boolean;
}

export function isAcquaintanceRevealed(a: { sourcePageId: string; sourceSectionId: string }, played: PlayedLookup): boolean {
  return played(a.sourcePageId, a.sourceSectionId);
}

export function revealedAcquaintanceIds(rows: Pick<AcquaintanceRecord, "id" | "sourcePageId" | "sourceSectionId">[], played: PlayedLookup): string[] {
  return rows.filter((r) => isAcquaintanceRevealed(r, played)).map((r) => r.id);
}

function viewEntries(row: AcquaintanceRecord, viewer: Viewer, played: PlayedLookup): AcquaintanceEntryView[] {
  return [...row.entries]
    .sort((a, b) => a.sortOrder - b.sortOrder || a.createdAt.getTime() - b.createdAt.getTime())
    .map((e) => ({ id: e.id, pageId: e.pageId, sectionId: e.sectionId, text: e.text, sortOrder: e.sortOrder, hidden: !played(e.pageId, e.sectionId) }))
    .filter((e) => viewer.isDM || !e.hidden);
}

function viewNotes(row: AcquaintanceRecord, viewer: Viewer): AcquaintanceNoteView[] {
  return row.notes
    .filter((n) => viewer.isDM || n.authorUserId === viewer.userId)
    .map((n) => ({ id: n.id, authorUserId: n.authorUserId, authorName: n.author.displayName, text: n.text, updatedAt: n.updatedAt.toISOString(), own: n.authorUserId === viewer.userId }));
}

function viewOne(row: AcquaintanceRecord, viewer: Viewer, played: PlayedLookup): AcquaintanceView {
  const fromCharacter = row.kind === "character" ? row.character : null;

  return {
    id: row.id,
    kind: row.kind as AcquaintanceKind,
    characterId: row.characterId,
    name: fromCharacter?.name ?? row.name,
    avatarUrl: fromCharacter ? fromCharacter.avatar : row.avatarUrl,
    description: fromCharacter?.background?.trim() || row.description,
    sourcePageId: row.sourcePageId,
    sourceSectionId: row.sourceSectionId,
    hidden: !isAcquaintanceRevealed(row, played),
    entries: viewEntries(row, viewer, played),
    notes: viewNotes(row, viewer),
  };
}

export function viewAcquaintances(rows: AcquaintanceRecord[], viewer: Viewer, played: PlayedLookup): AcquaintanceView[] {
  return rows
    .map((r) => viewOne(r, viewer, played))
    .filter((a) => viewer.isDM || !a.hidden)
    .sort(byName);
}
