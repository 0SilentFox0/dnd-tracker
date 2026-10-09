"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";

import { AddTokenDialog, TOKEN_DOT } from "./AddTokenDialog";
import { useProfile } from "./ProfileContext";
import { Section } from "./Section";

import { Button } from "@/components/ui/button";
import { useCharacterTokens } from "@/lib/hooks/characters";
import { useConfirm } from "@/lib/hooks/common";
import { cn } from "@/lib/utils";
import type { TokenColor } from "@/types/characters";

const COUNTERS: { color: TokenColor; label: string }[] = [
  { color: "red", label: "Червоні жетони" },
  { color: "green", label: "Зелені жетони" },
];

export function TokenList() {
  const { campaignId, characterId, sheet } = useProfile();

  const { add, remove, isPending } = useCharacterTokens(campaignId, characterId);

  const confirm = useConfirm();

  const [adding, setAdding] = useState(false);

  const isDM = sheet.viewer.isDM;

  const tokens = sheet.story.tokens;

  const askRemove = async (id: string, label: string) => {
    if (await confirm({ title: `Видалити жетон «${label}»?`, confirmLabel: "Видалити" })) await remove(id);
  };

  return (
    <Section
      title="ЖЕТОНИ"
      action={
        isDM && (
          <Button type="button" variant="ghost" className="h-9 px-2 text-hud-gold" onClick={() => setAdding(true)}>
            + Жетон
          </Button>
        )
      }
    >
      <div className="mb-1 flex gap-4">
        {COUNTERS.map(({ color, label }) => (
          <span key={color} aria-label={label} className="flex items-center gap-1.5 text-sm">
            <span className={cn("size-4 rounded-full", TOKEN_DOT[color])} />
            {tokens.filter((t) => t.color === color).length}
          </span>
        ))}
      </div>
      {tokens.length === 0 && <p className="text-sm text-hud-muted">Жетонів ще немає</p>}
      <ul>
        {tokens.map((t) => (
          <li key={t.id} className="flex items-center gap-2 border-b border-[#2a2218] py-1.5 text-sm">
            <span className={cn("size-3 shrink-0 rounded-full", TOKEN_DOT[t.color])} />
            <span className="min-w-0 flex-1 break-words">{t.label}</span>
            <span className="shrink-0 text-xs text-hud-muted">{new Date(t.createdAt).toLocaleDateString("uk-UA")}</span>
            {isDM && (
              <Button type="button" size="icon" variant="ghost" className="size-8" aria-label="Видалити жетон" disabled={isPending} onClick={() => void askRemove(t.id, t.label)}>
                <Trash2 className="size-4" />
              </Button>
            )}
          </li>
        ))}
      </ul>
      {isDM && <AddTokenDialog open={adding} onOpenChange={setAdding} onSubmit={add} isPending={isPending} />}
    </Section>
  );
}
