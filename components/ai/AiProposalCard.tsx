"use client";

import { useTranslations } from "next-intl";

import { ScenarioOpList } from "./ScenarioOpList";

import { Button } from "@/components/ui/button";
import type { AiProposal, ScenarioAiOp } from "@/types/ai";

interface AiProposalCardProps {
  proposal: AiProposal;
  actions: { onApply: () => void; onReject: () => void; onRedo: () => void };
  busy: boolean;
  campaignId: string;
}

function SlideView({ op }: { op: Extract<AiProposal["ops"][number], { op: "addSlide" }> }) {
  const t = useTranslations("ai");

  return (
    <div className="space-y-1 rounded border border-primary/40 p-2">
      {/* eslint-disable-next-line @next/next/no-img-element -- AI preview from storage, not a layout image */}
      <img src={op.slide.imageUrl} alt={op.slide.title ?? t("proposal.slideAlt")} className="max-h-60 w-full rounded object-contain" />
      <p className="text-xs text-muted-foreground">{op.deckId && op.deckTitle ? t("proposal.intoDeck", { title: op.deckTitle }) : t("proposal.newDeck")}</p>
      {op.slide.title ? <p className="text-sm">{op.slide.title}</p> : null}
    </div>
  );
}

export function AiProposalCard({ proposal, actions, busy, campaignId }: AiProposalCardProps) {
  const t = useTranslations("ai");

  const { status } = proposal;

  const open = status === "pending" || status === "stale";

  const slideOps = proposal.ops.filter((o) => o.op === "addSlide");

  return (
    <div className="space-y-2 rounded-lg border bg-card p-3 text-card-foreground" data-slot="ai-proposal-card">
      <p className="text-sm font-medium">{proposal.summary}</p>
      <p className="break-words text-xs">{t("proposal.target", { pageId: proposal.pageId })}</p>
      {open ? slideOps.map((op, i) => <SlideView key={i} op={op} />) : null}
      {open && slideOps.length === 0 ? <ScenarioOpList ops={proposal.ops as ScenarioAiOp[]} campaignId={campaignId} /> : null}
      {status === "stale" ? <p className="text-sm text-muted-foreground">{t("proposal.stale")}</p> : null}
      {status === "applied" || status === "rejected" ? <p className="text-xs text-muted-foreground">{t(`proposal.status.${status}`)}</p> : null}
      {open ? (
        <div className="flex gap-2">
          {status === "pending" ? (
            <Button type="button" size="sm" disabled={busy} onClick={actions.onApply}>
              {proposal.ops.some((o) => o.op === "addSlide") ? t("proposal.addSlide") : t("proposal.apply")}
            </Button>
          ) : (
            <Button type="button" size="sm" disabled={busy} onClick={actions.onRedo}>
              {t("proposal.redo")}
            </Button>
          )}
          <Button type="button" size="sm" variant="outline" disabled={busy} onClick={actions.onReject}>
            {t("proposal.reject")}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
