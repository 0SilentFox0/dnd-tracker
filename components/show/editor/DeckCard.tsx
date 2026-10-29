"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { Images } from "lucide-react";

import { OptimizedImage } from "@/components/common/OptimizedImage";
import { HudCard } from "@/components/hud/page";
import { Button } from "@/components/ui/button";
import { useConfirm } from "@/lib/hooks/common";
import type { SlideDeckSummary } from "@/types/show";

export function DeckCard({ deck, href, actions, pending, scene }: { deck: SlideDeckSummary; href: string; actions: { start(): void; remove(): void }; pending: boolean; scene?: string }) {
  const t = useTranslations("show");

  const tc = useTranslations("common");

  const confirm = useConfirm();

  const askRemove = async () => {
    const ok = await confirm({ title: t("deckCard.confirmTitle", { title: deck.title }), description: t("deckCard.confirmDescription"), confirmLabel: tc("actions.delete"), destructive: true });

    if (ok) actions.remove();
  };

  return (
    <HudCard className="flex flex-col gap-2">
      <div className="flex aspect-video items-center justify-center overflow-hidden rounded bg-black/50">
        {deck.coverUrl ? <OptimizedImage src={deck.coverUrl} alt="" width={480} height={270} className="size-full object-cover" /> : <Images className="size-8 text-hud-muted" aria-hidden />}
      </div>
      <div className="min-w-0">
        <p className="truncate font-medium text-hud-ink">{deck.title}</p>
        <p className="text-sm text-hud-muted">
          {t("deckCard.slides", { count: deck.slideCount })}
        </p>
        {scene && <p className="truncate text-xs text-hud-muted">{t("deckCard.scene", { scene })}</p>}
      </div>
      <div className="flex flex-wrap gap-2">
        <Button asChild size="sm" variant="outline">
          <Link href={href}>{tc("actions.edit")}</Link>
        </Button>
        <Button size="sm" disabled={deck.slideCount === 0 || pending} onClick={actions.start}>
          {t("startShow")}
        </Button>
        <Button size="sm" variant="outline" disabled={pending} onClick={() => void askRemove()}>
          {tc("actions.delete")}
        </Button>
      </div>
    </HudCard>
  );
}
