"use client";

import { useWorldEditorContext } from "./WorldEditorContext";

import { WorldNotesPanel } from "@/components/world/notes/WorldNotesPanel";
import type { RosterHero } from "@/lib/hooks/world";
import type { WorldMarker, WorldNote } from "@/types/world";

const NO_NOTES: WorldNote[] = [];

const NO_HEROES: RosterHero[] = [];

/** DM moderation of players' notes on a marker; shared by the desktop inspector and the mobile panel. */
export function DmMarkerNotes({ marker }: { marker: WorldMarker }) {
  const { campaignId, detail } = useWorldEditorContext();

  if (!detail) return null;

  return <WorldNotesPanel campaignId={campaignId} mapId={detail.map.id} marker={marker} notes={detail.notes ?? NO_NOTES} heroes={NO_HEROES} isDM />;
}
