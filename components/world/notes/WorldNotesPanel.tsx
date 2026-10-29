"use client";

import { useTranslations } from "next-intl";
import { Pencil, Trash2 } from "lucide-react";

import { HudChipTabs, HudPanel } from "@/components/hud/page";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { WORLD_NOTE_MAX } from "@/lib/constants/world";
import { type RosterHero, useNotesPanel } from "@/lib/hooks/world";
import type { WorldMarker, WorldNote } from "@/types/world";

export interface WorldNotesPanelProps {
  campaignId: string;
  mapId: string;
  marker: WorldMarker;
  notes: WorldNote[];
  heroes: RosterHero[];
  isDM?: boolean;
}

export function WorldNotesPanel({ campaignId, mapId, marker, notes, heroes, isDM = false }: WorldNotesPanelProps) {
  const t = useTranslations("world.notes");

  const tc = useTranslations("common.actions");

  const panel = useNotesPanel({ campaignId, mapId, markerId: marker.id, notes, heroes, isDM });

  return (
    <HudPanel as="div" className="flex flex-col gap-3">
      <h2 className="hud-sc text-base text-hud-ink">{marker.name}</h2>

      {isDM ? null : (
        <HudChipTabs
          ariaLabel={t("tabs")}
          items={[
            { key: "public", label: t("shared"), active: panel.tab === "public", onSelect: () => panel.setTab("public") },
            { key: "private", label: t("mine"), active: panel.tab === "private", onSelect: () => panel.setTab("private") },
          ]}
        />
      )}

      {panel.shown.length === 0 ? <p className="text-xs text-hud-muted">{t("empty")}</p> : null}

      <ul className="flex flex-col gap-2">
        {panel.shown.map((n) => (
          <li key={n.id} className="rounded-md border border-hud-rule bg-black/30 p-2 text-sm text-hud-ink">
            {panel.editing?.id === n.id ? (
              <div className="flex flex-col gap-2">
                <Textarea aria-label={t("text")} value={panel.editing.text} maxLength={WORLD_NOTE_MAX} onChange={(e) => panel.setEditText(e.target.value)} />
                <div className="flex gap-2">
                  <Button type="button" size="sm" onClick={() => void panel.saveEdit()}>
                    {tc("save")}
                  </Button>
                  <Button type="button" size="sm" variant="outline" onClick={panel.cancelEdit}>
                    {tc("cancel")}
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <p className="whitespace-pre-wrap">{n.text}</p>
                <div className="mt-1 flex items-center justify-between gap-2 text-xs text-hud-muted">
                  <span>{n.authorName}</span>
                  <span className="flex gap-1">
                    {panel.canEdit(n) ? (
                      <Button type="button" size="icon" variant="ghost" aria-label={t("edit")} onClick={() => panel.startEdit(n)}>
                        <Pencil className="size-4" />
                      </Button>
                    ) : null}
                    {panel.canRemove(n) ? (
                      <Button type="button" size="icon" variant="ghost" aria-label={t("delete")} onClick={() => void panel.removeNote(n.id)}>
                        <Trash2 className="size-4" />
                      </Button>
                    ) : null}
                  </span>
                </div>
              </>
            )}
          </li>
        ))}
      </ul>

      <form
        className="flex flex-col gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          void panel.submit();
        }}
      >
        <Textarea aria-label={t("new")} value={panel.text} onChange={(e) => panel.setText(e.target.value)} placeholder={!isDM && panel.tab === "private" ? t("onlyYou") : t("everyone")} />
        <div className="flex flex-wrap items-center gap-2">
          {!isDM && heroes.length > 1 ? (
            <select aria-label={t("asHero")} value={panel.characterId} onChange={(e) => panel.setCharacterId(e.target.value)} className="h-9 rounded-md border border-hud-rule bg-black/40 px-2 text-sm text-hud-ink">
              {heroes.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.name}
                </option>
              ))}
            </select>
          ) : null}
          <span className={panel.remaining < 0 ? "text-xs text-destructive" : "text-xs text-hud-muted"}>{panel.remaining}</span>
          <Button type="submit" size="sm" className="ml-auto" disabled={!panel.canSubmit}>
            {tc("add")}
          </Button>
        </div>
      </form>
    </HudPanel>
  );
}
