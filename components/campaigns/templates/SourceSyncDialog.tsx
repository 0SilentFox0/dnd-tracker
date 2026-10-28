"use client";

import { useId, useMemo } from "react";

import { EmptyState, ErrorState, LoadingState } from "@/components/common/states";
import { HudSection } from "@/components/hud/form";
import { HudPill } from "@/components/hud/page";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import { syncStatusLabel, syncTitle } from "@/lib/constants/source-sync";
import { useSourceDiff, useSourceSyncApply, useSourceSyncSelection } from "@/lib/hooks/campaigns";
import { useConfirm, useNotify } from "@/lib/hooks/common";
import { formatUsage, groupItems, itemKey, PLURAL_RECORDS, usageTotals } from "@/lib/utils/campaigns/source-sync";
import { pluralUk } from "@/lib/utils/common/plural";
import type { SourceDiffItem } from "@/types/campaigns";

interface SourceSyncDialogProps {
  campaignId: string;
  isTemplate: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const NO_ITEMS: SourceDiffItem[] = [];

function itemDetails(i: SourceDiffItem): string[] {
  const lines: string[] = [];

  if (i.changedFields.length > 0) lines.push(`Змінено: ${i.changedFields.join(", ")}`);

  if (i.status === "conflict") lines.push("Ви теж змінили цей запис — галочка замінить вашу версію версією джерела");

  const usage = i.status === "deletedInSource" && i.usage ? formatUsage(i.usage) : null;

  if (usage) lines.push(`Використовується: ${usage}`);

  if (i.status === "deletedLocally") lines.push("Ви видалили цей запис; галочка поверне його");

  return lines;
}

const pillTone = (status: SourceDiffItem["status"]) => (status === "conflict" ? "accent" : status === "deletedInSource" || status === "deletedLocally" ? "muted" : "bone");

interface SyncItemRowProps {
  item: SourceDiffItem;
  isTemplate: boolean;
  checked: boolean;
  onToggle: () => void;
}

function SyncItemRow({ item, isTemplate, checked, onToggle }: SyncItemRowProps) {
  const id = useId();

  const details = itemDetails(item);

  return (
    <li>
      <label className="flex cursor-pointer items-start gap-2 py-1">
        <Checkbox className="mt-0.5" checked={checked} onCheckedChange={onToggle} aria-labelledby={`${id}-name`} aria-describedby={`${id}-status ${id}-info`} />
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-2">
            <span id={`${id}-name`}>{item.name}</span>
            <span id={`${id}-status`}>
              <HudPill tone={pillTone(item.status)}>{syncStatusLabel(item.status, !isTemplate)}</HudPill>
            </span>
          </span>
          <span id={`${id}-info`}>
            {details.map((line) => (
              <span key={line} className="block text-xs text-hud-muted">
                {line}
              </span>
            ))}
          </span>
        </span>
      </label>
    </li>
  );
}

interface SyncGroupProps {
  group: ReturnType<typeof groupItems>[number];
  isTemplate: boolean;
  selection: ReturnType<typeof useSourceSyncSelection>;
}

function SyncGroup({ group, isTemplate, selection }: SyncGroupProps) {
  const allSelected = group.items.every((i) => selection.isSelected(i));

  return (
    <HudSection
      title={`${group.label} (${group.items.length})`}
      action={
        <Button variant="ghost" size="sm" onClick={() => selection.setGroup(group.scope, !allSelected)}>
          {allSelected ? "Зняти все" : "Вибрати все"}
        </Button>
      }
    >
      <ul className="space-y-1">
        {group.items.map((i) => (
          <SyncItemRow key={itemKey(i)} item={i} isTemplate={isTemplate} checked={selection.isSelected(i)} onToggle={() => selection.toggle(i)} />
        ))}
      </ul>
    </HudSection>
  );
}

export function SourceSyncDialog({ campaignId, isTemplate, open, onOpenChange }: SourceSyncDialogProps) {
  const diff = useSourceDiff(campaignId, open);

  const confirm = useConfirm();

  const notify = useNotify();

  const items = diff.data?.items ?? NO_ITEMS;

  const apply = useSourceSyncApply(campaignId, items);

  const selection = useSourceSyncSelection(items);

  const { refs, autoAdded } = selection;

  const groups = useMemo(() => groupItems(items), [items]);

  const syncedAt = diff.data?.syncedAt;

  const description = diff.data ? `Джерело: «${diff.data.source.name}»${syncedAt ? ` · остання синхронізація ${new Date(syncedAt).toLocaleString("uk-UA")}` : ""}` : "Зміни у джерелі";

  const handleOpenChange = (next: boolean) => {
    if (!next) apply.reset();

    onOpenChange(next);
  };

  const handleApply = async () => {
    const removed = items.filter((i) => i.status === "deletedInSource" && selection.isSelected(i));

    if (removed.length > 0) {
      const usage = formatUsage(usageTotals(removed));

      const ok = await confirm({
        title: `Видалити ${removed.length} ${pluralUk(removed.length, PLURAL_RECORDS)}, яких немає в ${isTemplate ? "джерелі" : "шаблоні"}?`,
        description: usage ? `Використовується: ${usage}.` : undefined,
        confirmLabel: "Видалити",
        destructive: true,
      });

      if (!ok) return;
    }

    apply.run({ apply: refs, ignore: [] }, (r) => {
      const added = r.autoAdded.length > 0 ? `, автоматично додано: ${r.autoAdded.map((a) => a.name).join(", ")}` : "";

      const warnings = r.warnings.length > 0 ? `. ${r.warnings.join(" ")}` : "";

      handleOpenChange(false);
      void notify(`Застосовано: ${r.applied}${added}${warnings}`);
    });
  };

  const handleIgnore = async () => {
    const ok = await confirm({
      title: `Приховати ${refs.length} ${pluralUk(refs.length, ["зміну", "зміни", "змін"])}?`,
      description: "Вони з'являться знову, лише коли джерело змінить ці записи.",
      confirmLabel: "Приховати",
    });

    if (ok) apply.run({ apply: [], ignore: refs }, (r) => void notify(`Приховано: ${r.ignored}`));
  };

  const hasItems = items.length > 0;

  const busy = apply.isPending || diff.isFetching;

  const noSelection = refs.length === 0;

  const renderBody = () => {
    if (diff.isLoading) return <LoadingState />;

    if (diff.isError) return <ErrorState error={diff.error} />;

    if (!hasItems) return <EmptyState title="Усе синхронізовано" description="Джерело не має змін, яких би не було у вас" />;

    return groups.map((group) => <SyncGroup key={group.scope} group={group} isTemplate={isTemplate} selection={selection} />);
  };

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={handleOpenChange}
      title={syncTitle(isTemplate)}
      description={description}
      hud
      footer={
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            {hasItems ? "Скасувати" : "Закрити"}
          </Button>
          {hasItems && (
            <>
              <Button variant="outline" onClick={handleIgnore} disabled={noSelection || busy}>
                Ігнорувати вибране
              </Button>
              <Button onClick={handleApply} disabled={noSelection || busy}>
                Застосувати ({refs.length})
              </Button>
            </>
          )}
        </div>
      }
    >
      {renderBody()}
      {autoAdded.length > 0 && <p className="mt-4 text-sm text-hud-muted">Також буде додано: {autoAdded.map((n) => n.name).join(", ")}</p>}
      {apply.staleNotice && !diff.isFetching && <p className="mt-4 text-sm text-hud-muted">Джерело змінилося — список оновлено, вибір скинуто до типового.</p>}
      {apply.error && (
        <p role="alert" className="mt-4 rounded-md border border-hud-danger/50 bg-hud-danger/10 px-3 py-2 text-sm text-destructive">
          {apply.error}
        </p>
      )}
    </ResponsiveDialog>
  );
}
