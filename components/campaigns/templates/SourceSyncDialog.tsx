"use client";

import { memo, useId, useMemo } from "react";
import { useFormatter } from "next-intl";

import { EmptyState, ErrorState, FormAlert, LoadingState } from "@/components/common/states";
import { HudSection } from "@/components/hud/form";
import { HudPill } from "@/components/hud/page";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import { syncStatusKey, syncTitleKey } from "@/lib/constants/source-sync";
import { useSourceDiff, useSourceSyncApply, useSourceSyncSelection } from "@/lib/hooks/campaigns";
import { useConfirm, useNotify } from "@/lib/hooks/common";
import type { Translator } from "@/lib/i18n/translator";
import { useTranslator } from "@/lib/i18n/use-translator";
import { formatUsage, groupItems, itemKey, usageTotals } from "@/lib/utils/campaigns/source-sync";
import type { SourceDiffItem } from "@/types/campaigns";

interface SourceSyncDialogProps {
  campaignId: string;
  isTemplate: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const NO_ITEMS: SourceDiffItem[] = [];

function itemName(item: SourceDiffItem, t: Translator, tr: Translator): string {
  if (item.scope === "rules" && tr.has(`mechanics.${item.key}.label`)) return tr(`mechanics.${item.key}.label`);

  if (item.scope === "settings") return t("sourceSync.settingsName");

  return item.name;
}

function itemDetails(i: SourceDiffItem, t: Translator): string[] {
  const lines: string[] = [];

  if (i.changedFields.length > 0) lines.push(t("sourceSync.details.changed", { fields: i.changedFields.join(", ") }));

  if (i.status === "conflict") lines.push(t("sourceSync.details.conflict"));

  const usage = i.status === "deletedInSource" && i.usage ? formatUsage(i.usage, t) : null;

  if (usage) lines.push(t("sourceSync.details.usage", { usage }));

  if (i.status === "deletedLocally") lines.push(t("sourceSync.details.deletedLocally"));

  return lines;
}

const pillTone = (status: SourceDiffItem["status"]) => (status === "conflict" ? "accent" : status === "deletedInSource" || status === "deletedLocally" ? "muted" : "bone");

interface SyncItemRowProps {
  item: SourceDiffItem;
  isTemplate: boolean;
  checked: boolean;
  onToggle: (item: SourceDiffItem) => void;
}

const SyncItemRow = memo(function SyncItemRow({ item, isTemplate, checked, onToggle }: SyncItemRowProps) {
  const t = useTranslator("campaigns");

  const tr = useTranslator("rules");

  const id = useId();

  const details = itemDetails(item, t);

  return (
    <li>
      <label className="flex cursor-pointer items-start gap-2 py-1">
        <Checkbox className="mt-0.5" checked={checked} onCheckedChange={() => onToggle(item)} aria-labelledby={`${id}-name`} aria-describedby={`${id}-status ${id}-info`} />
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-2">
            <span id={`${id}-name`}>{itemName(item, t, tr)}</span>
            <span id={`${id}-status`}>
              <HudPill tone={pillTone(item.status)}>{t(`sourceSync.status.${syncStatusKey(item.status, !isTemplate)}`)}</HudPill>
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
});

interface SyncGroupProps {
  group: ReturnType<typeof groupItems>[number];
  isTemplate: boolean;
  selection: ReturnType<typeof useSourceSyncSelection>;
}

function SyncGroup({ group, isTemplate, selection }: SyncGroupProps) {
  const t = useTranslator("campaigns");

  const allSelected = group.items.every((i) => selection.isSelected(i));

  return (
    <HudSection
      title={t("sourceSync.groupTitle", { label: t(`sourceSync.scope.${group.scope}`), count: group.items.length })}
      action={
        <Button variant="ghost" size="sm" onClick={() => selection.setGroup(group.scope, !allSelected)}>
          {allSelected ? t("sourceSync.deselectAll") : t("sourceSync.selectAll")}
        </Button>
      }
    >
      <ul className="space-y-1">
        {group.items.map((i) => (
          <SyncItemRow key={itemKey(i)} item={i} isTemplate={isTemplate} checked={selection.isSelected(i)} onToggle={selection.toggle} />
        ))}
      </ul>
    </HudSection>
  );
}

export function SourceSyncDialog({ campaignId, isTemplate, open, onOpenChange }: SourceSyncDialogProps) {
  const t = useTranslator("campaigns");

  const tc = useTranslator("common");

  const format = useFormatter();

  const diff = useSourceDiff(campaignId, open);

  const confirm = useConfirm();

  const notify = useNotify();

  const items = diff.data?.items ?? NO_ITEMS;

  const apply = useSourceSyncApply(campaignId, items);

  const selection = useSourceSyncSelection(items);

  const { refs, autoAdded } = selection;

  const groups = useMemo(() => groupItems(items), [items]);

  const syncedAt = diff.data?.syncedAt;

  const description = !diff.data
    ? t("sourceSync.description.fallback")
    : syncedAt
      ? t("sourceSync.description.synced", { name: diff.data.source.name, date: format.dateTime(new Date(syncedAt), { dateStyle: "short", timeStyle: "medium" }) })
      : t("sourceSync.description.source", { name: diff.data.source.name });

  const handleOpenChange = (next: boolean) => {
    if (!next) apply.reset();

    onOpenChange(next);
  };

  const handleApply = async () => {
    const removed = items.filter((i) => i.status === "deletedInSource" && selection.isSelected(i));

    if (removed.length > 0) {
      const usage = formatUsage(usageTotals(removed), t);

      const ok = await confirm({
        title: t("sourceSync.confirmDelete.title", { count: removed.length, where: t(isTemplate ? "sourceSync.where.source" : "sourceSync.where.template") }),
        description: usage ? t("sourceSync.confirmDelete.usage", { usage }) : undefined,
        confirmLabel: tc("actions.delete"),
        destructive: true,
      });

      if (!ok) return;
    }

    apply.run({ apply: refs, ignore: [] }, (r) => {
      handleOpenChange(false);
      void notify(
        t("sourceSync.applied", {
          applied: r.applied,
          hasAdded: String(r.autoAdded.length > 0),
          added: r.autoAdded.map((a) => a.name).join(", "),
          hasWarnings: String(r.warnings.length > 0),
          warnings: r.warnings.join(" "),
        }),
      );
    });
  };

  const handleIgnore = async () => {
    const ok = await confirm({
      title: t("sourceSync.confirmIgnore.title", { count: refs.length }),
      description: t("sourceSync.confirmIgnore.description"),
      confirmLabel: t("sourceSync.confirmIgnore.confirm"),
    });

    if (ok) apply.run({ apply: [], ignore: refs }, (r) => void notify(t("sourceSync.ignored", { count: r.ignored })));
  };

  const hasItems = items.length > 0;

  const busy = apply.isPending || diff.isFetching;

  const noSelection = refs.length === 0;

  const renderBody = () => {
    if (diff.isLoading) return <LoadingState />;

    if (diff.isError) return <ErrorState error={diff.error} />;

    if (!hasItems) return <EmptyState title={t("sourceSync.empty.title")} description={t("sourceSync.empty.description")} />;

    return groups.map((group) => <SyncGroup key={group.scope} group={group} isTemplate={isTemplate} selection={selection} />);
  };

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={handleOpenChange}
      title={t(`sourceSync.title.${syncTitleKey(isTemplate)}`)}
      description={description}
      hud
      footer={
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            {hasItems ? tc("actions.cancel") : t("sourceSync.close")}
          </Button>
          {hasItems && (
            <>
              <Button variant="outline" onClick={handleIgnore} disabled={noSelection || busy}>
                {t("sourceSync.ignore")}
              </Button>
              <Button onClick={handleApply} disabled={noSelection || busy}>
                {t("sourceSync.apply", { count: refs.length })}
              </Button>
            </>
          )}
        </div>
      }
    >
      {renderBody()}
      {autoAdded.length > 0 && <p className="mt-4 text-sm text-hud-muted">{t("sourceSync.alsoAdded", { names: autoAdded.map((n) => n.name).join(", ") })}</p>}
      {apply.staleNotice && !diff.isFetching && <p className="mt-4 text-sm text-hud-muted">{t("sourceSync.stale")}</p>}
      {apply.error && (
        <FormAlert className="mt-4">{apply.error}</FormAlert>
      )}
    </ResponsiveDialog>
  );
}
