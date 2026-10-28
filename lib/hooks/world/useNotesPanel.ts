"use client";

import { useState } from "react";

import type { RosterHero } from "./useWorldHeroes";
import { useWorldNotes } from "./useWorldNotes";

import { WORLD_NOTE_MAX } from "@/lib/constants/world";
import { useConfirm } from "@/lib/hooks/common";
import type { WorldNote } from "@/types/world";

export type NotesTab = "public" | "private";

interface Options {
  campaignId: string;
  mapId: string;
  markerId: string;
  notes: WorldNote[];
  heroes: RosterHero[];
  isDM: boolean;
}

export function useNotesPanel({ campaignId, mapId, markerId, notes, heroes, isDM }: Options) {
  const { create, update, remove } = useWorldNotes(campaignId, mapId);

  const confirm = useConfirm();

  const [tab, setTab] = useState<NotesTab>("public");

  const activeTab: NotesTab = isDM ? "public" : tab;

  const [text, setText] = useState("");

  const [characterId, setCharacterId] = useState("");

  const [editing, setEditing] = useState<{ id: string; text: string } | null>(null);

    const shown = notes.filter((n) => n.markerId === markerId && n.visibility === activeTab && (activeTab === "public" || n.mine));

  const canSubmit = text.trim().length > 0 && text.length <= WORLD_NOTE_MAX && !create.isPending;

  const submit = async () => {
    if (!canSubmit) return;

    const author = isDM ? undefined : characterId || heroes[0]?.id;

    if (await create.mutateOk({ markerId, text: text.trim(), visibility: activeTab, ...(author ? { characterId: author } : {}) })) setText("");
  };

  const saveEdit = async () => {
    if (!editing || !editing.text.trim() || editing.text.length > WORLD_NOTE_MAX) return;

    if (await update.mutateOk({ id: editing.id, data: { text: editing.text.trim() } })) setEditing(null);
  };

  const removeNote = async (id: string) => {
    if (await confirm({ title: "Видалити нотатку?", confirmLabel: "Видалити", destructive: true })) await remove.mutateOk(id);
  };

  return {
    tab: activeTab,
    setTab,
    shown,
    text,
    setText,
    remaining: WORLD_NOTE_MAX - text.length,
    characterId: characterId || heroes[0]?.id || "",
    setCharacterId,
    canSubmit,
    submit,
    editing,
    startEdit: (n: WorldNote) => setEditing({ id: n.id, text: n.text }),
    setEditText: (t: string) => setEditing((e) => (e ? { ...e, text: t } : e)),
    cancelEdit: () => setEditing(null),
    saveEdit,
    removeNote,
    canEdit: (n: WorldNote) => n.mine,
    canRemove: (n: WorldNote) => n.mine || isDM,
    isPending: create.isPending,
  };
}
