"use client";

import { useState } from "react";
import { Check, Pencil, Plus, Trash2, X } from "lucide-react";

import { useProfile } from "./ProfileContext";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { GOAL_KIND_LABEL, GOAL_TEXT_MAX, GOAL_TITLE_MAX, GoalAuthor, GoalKind, GoalStatus } from "@/lib/constants/characters";
import { useCharacterGoals } from "@/lib/hooks/characters";
import { useConfirm } from "@/lib/hooks/common";
import { cn } from "@/lib/utils";
import type { CharacterGoal } from "@/types/characters";

const ORDER: Record<GoalStatus, number> = { [GoalStatus.ACTIVE]: 0, [GoalStatus.DONE]: 1, [GoalStatus.FAILED]: 2 };

const NEXT: Record<GoalStatus, GoalStatus> = { [GoalStatus.ACTIVE]: GoalStatus.DONE, [GoalStatus.DONE]: GoalStatus.FAILED, [GoalStatus.FAILED]: GoalStatus.ACTIVE };

const STATUS_LABEL: Record<GoalStatus, string> = { [GoalStatus.ACTIVE]: "активна", [GoalStatus.DONE]: "виконана", [GoalStatus.FAILED]: "провалена" };

const goalName = (g: CharacterGoal) => g.title ?? g.text;

const newId = () => `g${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

export function GoalList() {
  const { campaignId, characterId, sheet } = useProfile();

  const { save, isPending } = useCharacterGoals(campaignId, characterId);

  const confirm = useConfirm();

  const isDM = sheet.viewer.isDM;

  const all = sheet.story.goals;

  const goals = [...all].sort((a, b) => ORDER[a.status] - ORDER[b.status]);

  const canEdit = (g: CharacterGoal) => isDM || (sheet.viewer.isOwner && g.author === GoalAuthor.PLAYER);

  const [draft, setDraft] = useState<{ id: string | null; title: string; text: string } | null>(null);

  const send = (next: CharacterGoal[]) => (isDM ? save(next, all.map((g) => g.id)) : save(next.filter((g) => g.author === GoalAuthor.PLAYER)));

  const commit = async () => {
    const text = draft?.text.trim().slice(0, GOAL_TEXT_MAX);

    if (!draft || !text) return;

    const title = draft.title.trim().slice(0, GOAL_TITLE_MAX) || undefined;

    const next = draft.id
      ? all.map((g) => (g.id === draft.id ? { ...g, text, title } : g))
      : [...all, { id: newId(), text, ...(title && { title }), status: GoalStatus.ACTIVE, author: isDM ? GoalAuthor.DM : GoalAuthor.PLAYER }];

    if (await send(next)) setDraft(null);
  };

  const remove = async (g: CharacterGoal) => {
    if (await confirm({ title: `Видалити ціль «${goalName(g)}»?`, confirmLabel: "Видалити" })) await send(all.filter((x) => x.id !== g.id));
  };

  return (
    <section>
      <h2 className="hud-sc mb-1.5 text-[13px] tracking-[.06em] text-hud-gold">ЦІЛІ</h2>
      {goals.length === 0 && <p className="text-sm text-hud-muted">Цілей поки немає.</p>}
      <ul>
        {goals.map((g) => (
          <li key={g.id} className="flex items-start gap-2 border-b border-[#2a2218] py-2.5 text-sm last:border-b-0">
            <button
              type="button"
              disabled={!isDM || isPending}
              aria-label={`Статус «${goalName(g)}»: ${STATUS_LABEL[g.status]}`}
              onClick={() => void send(all.map((x) => (x.id === g.id ? { ...x, status: NEXT[x.status] } : x)))}
              className="flex size-8 shrink-0 items-center justify-center text-hud-gold disabled:cursor-default"
            >
              {g.status === "done" ? <Check className="size-4" /> : g.status === "failed" ? <X className="size-4" /> : "◆"}
            </button>
            <div className={cn("min-w-0 flex-1 pt-1.5", g.status !== GoalStatus.ACTIVE && "opacity-60")}>
              {(g.title || g.kind || g.author === GoalAuthor.PLAYER) && (
                <div className="mb-1 flex flex-wrap items-baseline gap-x-2 gap-y-1">
                  {g.title && <span className={cn("hud-sc text-[15px] text-hud-bone", g.status !== GoalStatus.ACTIVE && "line-through")}>{g.title}</span>}
                  {g.kind && (
                    <span className={cn("rounded border px-1.5 text-[10px] uppercase tracking-[.06em]", g.kind === GoalKind.SECRET ? "border-[#a05a5a] text-[#d08a8a]" : "border-[#5a4a32] text-hud-gold")}>
                      {GOAL_KIND_LABEL[g.kind]}
                    </span>
                  )}
                  {g.author === GoalAuthor.PLAYER && <span className="inline-block rounded border border-[#6f8fb0] px-1 text-[10px] text-[#6f8fb0]">від гравця</span>}
                </div>
              )}
              <p className={cn("leading-relaxed", g.title ? "text-hud-muted" : "text-hud-bone", !g.title && g.status !== GoalStatus.ACTIVE && "line-through")}>{g.text}</p>
            </div>
            {canEdit(g) && (
              <>
                <Button type="button" size="icon" variant="ghost" className="size-8" aria-label={`Редагувати ціль ${goalName(g)}`} onClick={() => setDraft({ id: g.id, title: g.title ?? "", text: g.text })}>
                  <Pencil className="size-4" />
                </Button>
                <Button type="button" size="icon" variant="ghost" className="size-8" aria-label={`Видалити ціль ${goalName(g)}`} onClick={() => void remove(g)}>
                  <Trash2 className="size-4" />
                </Button>
              </>
            )}
          </li>
        ))}
      </ul>
      {draft ? (
        <div className="mt-2 flex items-start gap-2">
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <Input aria-label="Назва цілі" placeholder="Назва (необов'язково)" maxLength={GOAL_TITLE_MAX} value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} className="h-11" />
            <Textarea aria-label="Текст цілі" maxLength={GOAL_TEXT_MAX} value={draft.text} onChange={(e) => setDraft({ ...draft, text: e.target.value })}
              onKeyDown={(e) => {
                if (e.key !== "Enter" || e.shiftKey) return;

                e.preventDefault();
                void commit();
              }}
              autoFocus
            />
          </div>
          <Button type="button" className="h-11" aria-label="Зберегти ціль" disabled={isPending || !draft.text.trim()} onClick={() => void commit()}>
            <Check className="size-4" />
          </Button>
          <Button type="button" variant="ghost" className="h-11" aria-label="Скасувати" onClick={() => setDraft(null)}>
            <X className="size-4" />
          </Button>
        </div>
      ) : (
        (isDM || sheet.viewer.isOwner) && (
          <Button type="button" variant="ghost" className="mt-1 h-11 gap-1 px-0 text-hud-gold" onClick={() => setDraft({ id: null, title: "", text: "" })}>
            <Plus className="size-4" />
            Додати ціль
          </Button>
        )
      )}
    </section>
  );
}
