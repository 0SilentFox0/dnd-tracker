"use client";

import { useState } from "react";
import { Check, Pencil, Plus, Trash2, X } from "lucide-react";

import { useProfile } from "./ProfileContext";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCharacterGoals } from "@/lib/hooks/characters";
import { useConfirm } from "@/lib/hooks/common";
import { cn } from "@/lib/utils";
import type { CharacterGoal, GoalStatus } from "@/types/characters";

const ORDER: Record<GoalStatus, number> = { active: 0, done: 1, failed: 2 };

const NEXT: Record<GoalStatus, GoalStatus> = { active: "done", done: "failed", failed: "active" };

const STATUS_LABEL: Record<GoalStatus, string> = { active: "активна", done: "виконана", failed: "провалена" };

const newId = () => `g${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

export function GoalList() {
  const { campaignId, characterId, sheet } = useProfile();

  const { save, isPending } = useCharacterGoals(campaignId, characterId);

  const confirm = useConfirm();

  const isDM = sheet.viewer.isDM;

  const all = sheet.story.goals;

  const goals = [...all].sort((a, b) => ORDER[a.status] - ORDER[b.status]);

  const canEdit = (g: CharacterGoal) => isDM || (sheet.viewer.isOwner && g.author === "player");

  const [draft, setDraft] = useState<{ id: string | null; text: string } | null>(null);

  const send = (next: CharacterGoal[]) => save(isDM ? next : next.filter((g) => g.author === "player"));

  const commit = async () => {
    const text = draft?.text.trim().slice(0, 300);

    if (!draft || !text) return;

    const next = draft.id
      ? all.map((g) => (g.id === draft.id ? { ...g, text } : g))
      : [...all, { id: newId(), text, status: "active" as const, author: isDM ? ("dm" as const) : ("player" as const) }];

    if (await send(next)) setDraft(null);
  };

  const remove = async (g: CharacterGoal) => {
    if (await confirm({ title: `Видалити ціль «${g.text}»?`, confirmLabel: "Видалити" })) await send(all.filter((x) => x.id !== g.id));
  };

  return (
    <section>
      <h2 className="hud-sc mb-1.5 text-[13px] tracking-[.06em] text-[#c9b37a]">ЦІЛІ</h2>
      {goals.length === 0 && <p className="text-sm text-[#8f8473]">Цілей поки немає.</p>}
      <ul>
        {goals.map((g) => (
          <li key={g.id} className="flex items-start gap-2 border-b border-[#2a2218] py-1.5 text-sm">
            <button
              type="button"
              disabled={!isDM || isPending}
              aria-label={`Статус «${g.text}»: ${STATUS_LABEL[g.status]}`}
              onClick={() => void send(all.map((x) => (x.id === g.id ? { ...x, status: NEXT[x.status] } : x)))}
              className="flex size-8 shrink-0 items-center justify-center text-[#c9b37a] disabled:cursor-default"
            >
              {g.status === "done" ? <Check className="size-4" /> : g.status === "failed" ? <X className="size-4" /> : "◆"}
            </button>
            <span className={cn("min-w-0 flex-1 pt-1.5", g.status !== "active" && "text-[#8f8473] line-through")}>
              {g.text}
              {g.author === "player" && <span className="ml-1.5 inline-block rounded border border-[#6f8fb0] px-1 text-[10px] text-[#6f8fb0]">від гравця</span>}
            </span>
            {canEdit(g) && (
              <>
                <Button type="button" size="icon" variant="ghost" className="size-8" aria-label={`Редагувати ціль ${g.text}`} onClick={() => setDraft({ id: g.id, text: g.text })}>
                  <Pencil className="size-4" />
                </Button>
                <Button type="button" size="icon" variant="ghost" className="size-8" aria-label={`Видалити ціль ${g.text}`} onClick={() => void remove(g)}>
                  <Trash2 className="size-4" />
                </Button>
              </>
            )}
          </li>
        ))}
      </ul>
      {draft ? (
        <div className="mt-2 flex gap-2">
          <Input aria-label="Текст цілі" maxLength={300} value={draft.text} onChange={(e) => setDraft({ ...draft, text: e.target.value })} className="h-11 min-w-0 flex-1" autoFocus />
          <Button type="button" className="h-11" aria-label="Зберегти ціль" disabled={isPending || !draft.text.trim()} onClick={() => void commit()}>
            <Check className="size-4" />
          </Button>
          <Button type="button" variant="ghost" className="h-11" aria-label="Скасувати" onClick={() => setDraft(null)}>
            <X className="size-4" />
          </Button>
        </div>
      ) : (
        (isDM || sheet.viewer.isOwner) && (
          <Button type="button" variant="ghost" className="mt-1 h-11 gap-1 px-0 text-[#c9b37a]" onClick={() => setDraft({ id: null, text: "" })}>
            <Plus className="size-4" />
            Додати ціль
          </Button>
        )
      )}
    </section>
  );
}
