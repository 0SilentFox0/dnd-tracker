"use client";

import { useState } from "react";
import { useFormatter, useTranslations } from "next-intl";
import { Trash2 } from "lucide-react";

import { AddTokenDialog, TOKEN_DOT } from "./AddTokenDialog";
import { useProfile } from "./ProfileContext";

import { HudSection } from "@/components/hud/form";
import { Button } from "@/components/ui/button";
import { useCharacterTokens } from "@/lib/hooks/characters";
import { useConfirm } from "@/lib/hooks/common";
import { cn } from "@/lib/utils";
import type { TokenColor } from "@/types/characters";

const COUNTERS: TokenColor[] = ["red", "green"];

export function TokenList() {
  const { campaignId, characterId, sheet } = useProfile();

  const t = useTranslations("characterProfile.tokens");

  const tc = useTranslations("common.actions");

  const format = useFormatter();

  const { add, remove, isPending } = useCharacterTokens(campaignId, characterId);

  const confirm = useConfirm();

  const [adding, setAdding] = useState(false);

  const isDM = sheet.viewer.isDM;

  const tokens = sheet.story.tokens;

  const askRemove = async (id: string, label: string) => {
    if (await confirm({ title: t("deleteConfirm", { label }), confirmLabel: tc("delete") })) await remove(id);
  };

  return (
    <HudSection
      title={t("title")}
      action={
        isDM && (
          <Button type="button" variant="ghost" className="h-9 px-2 text-hud-gold" onClick={() => setAdding(true)}>
            {t("add")}
          </Button>
        )
      }
    >
      <div className="mb-1 flex gap-4">
        {COUNTERS.map((color) => (
          <span key={color} aria-label={t(`counters.${color}`)} className="flex items-center gap-1.5 text-sm">
            <span className={cn("size-4 rounded-full", TOKEN_DOT[color])} />
            {tokens.filter((tk) => tk.color === color).length}
          </span>
        ))}
      </div>
      {tokens.length === 0 && <p className="text-sm text-hud-muted">{t("empty")}</p>}
      <ul>
        {tokens.map((token) => (
          <li key={token.id} className="flex items-center gap-2 border-b border-[#2a2218] py-1.5 text-sm">
            <span className={cn("size-3 shrink-0 rounded-full", TOKEN_DOT[token.color])} />
            <span className="min-w-0 flex-1 break-words">{token.label}</span>
            <span className="shrink-0 text-xs text-hud-muted">{format.dateTime(new Date(token.createdAt), { dateStyle: "short" })}</span>
            {isDM && (
              <Button type="button" size="icon" variant="ghost" className="size-8" aria-label={t("deleteLabel")} disabled={isPending} onClick={() => void askRemove(token.id, token.label)}>
                <Trash2 className="size-4" />
              </Button>
            )}
          </li>
        ))}
      </ul>
      {isDM && <AddTokenDialog open={adding} onOpenChange={setAdding} onSubmit={add} isPending={isPending} />}
    </HudSection>
  );
}
