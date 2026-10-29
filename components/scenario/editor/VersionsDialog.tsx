"use client";

import { useFormatter, useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import { useConfirm } from "@/lib/hooks/common";
import { useScenarioVersions } from "@/lib/hooks/scenario";

const DATE_FORMAT = { dateStyle: "medium", timeStyle: "short" } as const;

export function VersionsDialog({ campaignId, pageId, open, onOpenChange, onRestored }: { campaignId: string; pageId: string; open: boolean; onOpenChange: (o: boolean) => void; onRestored: () => void }) {
  const t = useTranslations("scenario.versions");

  const tStates = useTranslations("common.states");

  const format = useFormatter();

  const { versions, isLoading, restore, isRestoring } = useScenarioVersions(campaignId, pageId, open);

  const confirm = useConfirm();

  const pick = async (id: string, at: string) => {
    if (!(await confirm({ title: t("restoreTitle", { date: format.dateTime(new Date(at), DATE_FORMAT) }), description: t("restoreDescription"), confirmLabel: t("restore") }))) return;

    await restore(id).catch(() => {});
    onRestored();
    onOpenChange(false);
  };

  return (
    <ResponsiveDialog hud open={open} onOpenChange={onOpenChange} title={t("title")}>
      {isLoading && <p className="text-sm text-hud-muted">{tStates("loading")}</p>}
      {!isLoading && versions.length === 0 && <p className="text-sm text-hud-muted">{t("empty")}</p>}
      <ul className="space-y-2">
        {versions.map((v) => (
          <li key={v.id} className="flex items-center justify-between gap-3">
            <span>{format.dateTime(new Date(v.createdAt), DATE_FORMAT)}</span>
            <Button size="sm" variant="outline" disabled={isRestoring} onClick={() => void pick(v.id, v.createdAt)}>
              {t("restore")}
            </Button>
          </li>
        ))}
      </ul>
    </ResponsiveDialog>
  );
}
