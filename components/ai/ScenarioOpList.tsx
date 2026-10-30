"use client";

import { useTranslations } from "next-intl";

import { PagerNav } from "@/components/common/PagerNav";
import { ScenarioRichText } from "@/components/scenario/ScenarioRichText";
import { ASSISTANT_PAGE_SIZES } from "@/lib/constants/ai";
import { usePager } from "@/lib/hooks/common";
import { addedMentionCount } from "@/lib/utils/scenario/ai-refs";
import { describeLost, lostBlocks } from "@/lib/utils/scenario/block-inventory";
import type { ScenarioAiOp } from "@/types/ai";
import type { RichDoc, ScenarioRow } from "@/types/scenario";

type Op = Exclude<ScenarioAiOp, { op: "createAcquaintance" }>;

function Doc({ doc, campaignId }: { doc: RichDoc; campaignId: string }) {
  return (
    <div className="scenario-book scenario-book--inline text-sm">
      <ScenarioRichText doc={doc} campaignId={campaignId} />
    </div>
  );
}

function Row({ row, campaignId }: { row: Pick<ScenarioRow, "story" | "notes">; campaignId: string }) {
  return (
    <div className="space-y-1">
      <Doc doc={row.story} campaignId={campaignId} />
      <Doc doc={row.notes} campaignId={campaignId} />
    </div>
  );
}

function Diff({ label, before, after, campaignId }: { label: string; before: RichDoc; after: RichDoc; campaignId: string }) {
  const t = useTranslations("ai");

  return (
    <div className="grid grid-cols-1 gap-2 @[560px]:grid-cols-2">
      <div className="rounded border p-2">
        <p className="mb-1 text-xs text-muted-foreground">{t("proposal.before", { label })}</p>
        <Doc doc={before} campaignId={campaignId} />
      </div>
      <div className="rounded border border-primary/40 p-2">
        <p className="mb-1 text-xs text-muted-foreground">{t("proposal.after", { label })}</p>
        <Doc doc={after} campaignId={campaignId} />
      </div>
    </div>
  );
}

function LossWarning({ before, after }: { before: RichDoc; after: RichDoc }) {
  const t = useTranslations("ai");

  const lost = lostBlocks(before, after);

  if (Object.keys(lost).length === 0) return null;

  return <p className="text-sm font-medium text-destructive">{t("proposal.loss", { lost: describeLost(lost, (kind, count) => t(`proposal.blocks.${kind}`, { count })) })}</p>;
}

function ChipsOnly({ label, count, doc, campaignId }: { label: string; count: number; doc: RichDoc; campaignId: string }) {
  const t = useTranslations("ai");

  return (
    <div className="rounded border border-primary/40 p-2">
      <p className="mb-1 text-xs text-muted-foreground">{t("proposal.chipsAdded", { label, count })}</p>
      <Doc doc={doc} campaignId={campaignId} />
    </div>
  );
}

function ReplaceRowView({ op, campaignId }: { op: Extract<Op, { op: "replaceRow" }>; campaignId: string }) {
  const t = useTranslations("ai");

  const parts = [
    { key: "story", before: op.before.story, after: op.story },
    { key: "notes", before: op.before.notes, after: op.notes },
  ] as const;

  const changed = parts.flatMap((p) => (p.after ? [{ ...p, after: p.after, added: addedMentionCount(p.before, p.after) }] : []));

  if (changed.length > 0 && changed.every((p) => p.added !== null)) {
    return (
      <div className="space-y-2">
        {changed.map((p) => (
          <ChipsOnly key={p.key} label={t(`proposal.parts.${p.key}`)} count={p.added ?? 0} doc={p.after} campaignId={campaignId} />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {changed.map((p) => (
        <div key={p.key} className="space-y-2">
          <LossWarning before={p.before} after={p.after} />
          <Diff label={t(`proposal.parts.${p.key}`)} before={p.before} after={p.after} campaignId={campaignId} />
        </div>
      ))}
    </div>
  );
}

function OpView({ op, campaignId }: { op: Op; campaignId: string }) {
  const t = useTranslations("ai");

  if (op.op === "replaceRow") return <ReplaceRowView op={op} campaignId={campaignId} />;

  if (op.op === "insertRow") {
    return (
      <div className="rounded border border-primary/40 p-2">
        <p className="mb-1 text-xs text-muted-foreground">{t("proposal.newRow")}</p>
        <Row row={op.row} campaignId={campaignId} />
      </div>
    );
  }

  if (op.op === "addSection") {
    return (
      <div className="rounded border border-primary/40 p-2">
        <p className="mb-1 text-xs text-muted-foreground">{t("proposal.newSection", { title: op.section.title })}</p>
        {op.section.rows.map((r) => (
          <Row key={r.id} row={r} campaignId={campaignId} />
        ))}
      </div>
    );
  }

  return (
    <p className="text-sm">{t("proposal.rename", { from: op.before.title, to: op.title })}</p>
  );
}

export function ScenarioOpList({ ops, campaignId }: { ops: ScenarioAiOp[]; campaignId: string }) {
  const t = useTranslations("ai");

  const npcs = ops.filter((o) => o.op === "createAcquaintance");

  const rest = ops.filter((o): o is Op => o.op !== "createAcquaintance");

  const changedRows = rest.filter((o) => o.op === "replaceRow").length;

  const pager = usePager(rest, ASSISTANT_PAGE_SIZES.changes);

  return (
    <div className="space-y-2">
      {npcs.map((op, i) => (
        <div key={i} className="rounded border border-primary/40 p-2" data-slot="ai-proposal-npc">
          <p className="text-sm font-medium">{t("proposal.newAcquaintance", { name: op.name })}</p>
          {op.description ? <p className="text-xs text-muted-foreground">{op.description}</p> : null}
        </div>
      ))}
      {changedRows >= 2 ? <p className="text-xs text-muted-foreground">{t("proposal.changedRows", { count: changedRows })}</p> : null}
      {pager.pageItems.map((op, i) => (
        <OpView key={i} op={op} campaignId={campaignId} />
      ))}
      {pager.pageCount > 1 && <PagerNav ariaLabel={t("intent.pagesAria")} pager={pager} labels={{ prev: t("intent.prevChanges"), next: t("intent.nextChanges") }} />}
    </div>
  );
}
