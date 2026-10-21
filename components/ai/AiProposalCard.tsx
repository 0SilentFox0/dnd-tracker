"use client";

import { ScenarioRichText } from "@/components/scenario/ScenarioRichText";
import { Button } from "@/components/ui/button";
import type { AiProposal } from "@/types/ai";
import type { RichDoc, ScenarioRow } from "@/types/scenario";

interface AiProposalCardProps {
  proposal: AiProposal;
  actions: { onApply: () => void; onReject: () => void; onRedo: () => void };
  busy: boolean;
}

type Op = AiProposal["ops"][number];

const STATUS_LABELS = { applied: "Застосовано", rejected: "Відхилено" } as const;

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
  return (
    <div className="grid grid-cols-2 gap-2">
      <div className="rounded border p-2">
        <p className="mb-1 text-xs text-muted-foreground">Було · {label}</p>
        <Doc doc={before} campaignId={campaignId} />
      </div>
      <div className="rounded border border-primary/40 p-2">
        <p className="mb-1 text-xs text-muted-foreground">Стало · {label}</p>
        <Doc doc={after} campaignId={campaignId} />
      </div>
    </div>
  );
}

function OpView({ op, campaignId }: { op: Op; campaignId: string }) {
  if (op.op === "replaceRow") {
    return (
      <div className="space-y-2">
        {op.story ? <Diff label="історія" before={op.before.story} after={op.story} campaignId={campaignId} /> : null}
        {op.notes ? <Diff label="нотатки" before={op.before.notes} after={op.notes} campaignId={campaignId} /> : null}
      </div>
    );
  }

  if (op.op === "insertRow") {
    return (
      <div className="rounded border border-primary/40 p-2">
        <p className="mb-1 text-xs text-muted-foreground">Новий рядок</p>
        <Row row={op.row} campaignId={campaignId} />
      </div>
    );
  }

  if (op.op === "addSection") {
    return (
      <div className="rounded border border-primary/40 p-2">
        <p className="mb-1 text-xs text-muted-foreground">Новий розділ «{op.section.title}»</p>
        {op.section.rows.map((r) => (
          <Row key={r.id} row={r} campaignId={campaignId} />
        ))}
      </div>
    );
  }

  return (
    <p className="text-sm">
      «{op.before.title}» → «{op.title}»
    </p>
  );
}

export function AiProposalCard({ proposal, actions, busy }: AiProposalCardProps) {
  const { status } = proposal;

  const campaignId = "";

  return (
    <div className="space-y-2 rounded-lg border bg-card p-3 text-card-foreground" data-slot="ai-proposal-card">
      <p className="text-sm font-medium">{proposal.summary}</p>
      {status === "pending" || status === "stale" ? proposal.ops.map((op, i) => <OpView key={i} op={op} campaignId={campaignId} />) : null}
      {status === "stale" ? <p className="text-sm text-muted-foreground">Фрагмент змінився після пропозиції</p> : null}
      {status === "applied" || status === "rejected" ? <p className="text-xs text-muted-foreground">{STATUS_LABELS[status]}</p> : null}
      {status === "pending" || status === "stale" ? (
        <div className="flex gap-2">
          {status === "pending" ? (
            <Button type="button" size="sm" disabled={busy} onClick={actions.onApply}>
              Застосувати
            </Button>
          ) : (
            <Button type="button" size="sm" disabled={busy} onClick={actions.onRedo}>
              Переробити
            </Button>
          )}
          <Button type="button" size="sm" variant="outline" disabled={busy} onClick={actions.onReject}>
            Відхилити
          </Button>
        </div>
      ) : null}
    </div>
  );
}
