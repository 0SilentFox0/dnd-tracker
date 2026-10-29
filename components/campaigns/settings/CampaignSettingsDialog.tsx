"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import { CreditsText } from "@/components/campaigns/templates/CreditsText";
import { SaveAsTemplateDialog } from "@/components/campaigns/templates/SaveAsTemplateDialog";
import { SourceSyncDialog } from "@/components/campaigns/templates/SourceSyncDialog";
import { FormAlert } from "@/components/common/states";
import { HudSection } from "@/components/hud/form";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { LabeledInput } from "@/components/ui/labeled-input";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import { Textarea } from "@/components/ui/textarea";
import { CampaignStatus } from "@/lib/constants/campaigns";
import { syncTitleKey } from "@/lib/constants/source-sync";
import { useCampaignExportUrl, useDeleteCampaign, useUpdateCampaign } from "@/lib/hooks/campaigns";
import { useConfirm } from "@/lib/hooks/common";
import type { CampaignSettings, CampaignSettingsMeta } from "@/types/campaigns";

interface CampaignSettingsDialogProps {
  campaignId: string;
  campaign: CampaignSettings;
  meta: CampaignSettingsMeta;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const toFields = (c: CampaignSettings) => ({ ...c, description: c.description || "" });

export function CampaignSettingsDialog({ campaignId, campaign, meta, open, onOpenChange }: CampaignSettingsDialogProps) {
  const t = useTranslations("campaigns");

  const tc = useTranslations("common");

  const update = useUpdateCampaign(campaignId);

  const remove = useDeleteCampaign(campaignId);

  const confirm = useConfirm();

  const [fields, setFields] = useState(() => toFields(campaign));

  const [error, setError] = useState<string | null>(null);

  const [templateOpen, setTemplateOpen] = useState(false);

  const [syncOpen, setSyncOpen] = useState(false);

  const exportUrl = useCampaignExportUrl(campaignId);

  const isSaving = update.isPending || remove.isPending;

  const set = <K extends keyof typeof fields>(key: K, value: (typeof fields)[K]) => setFields((prev) => ({ ...prev, [key]: value }));

  const handleSave = () => {
    setError(null);
    update.mutate(
      { ...fields, name: fields.name.trim(), description: fields.description.trim() || null },
      {
        onSuccess: () => onOpenChange(false),
        onError: (err) => setError(err instanceof Error ? err.message : tc("form.saveFailed")),
      },
    );
  };

  const handleDelete = async () => {
    const ok = await confirm({
      title: t("settings.confirmDelete.title", { name: campaign.name }),
      description: t("settings.confirmDelete.description"),
      confirmLabel: tc("actions.delete"),
      destructive: true,
    });

    if (!ok) return;

    setError(null);
    remove.mutate(undefined, {
      onError: (err) => setError(err instanceof Error ? err.message : t("settings.deleteFailed")),
    });
  };

  return (
    <>
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title={t("settings.title")}
      description={t("settings.description")}
      hud
      footer={
        <>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
            {tc("actions.cancel")}
          </Button>
          <Button onClick={handleSave} disabled={isSaving || !fields.name.trim()}>
            {isSaving ? tc("actions.saving") : tc("actions.save")}
          </Button>
        </>
      }
    >
      <HudSection title={t("settings.campaign")}>
        <div className="space-y-4">
          <LabeledInput id="campaign-name" label={t("settings.name")} value={fields.name} onChange={(e) => set("name", e.target.value)} disabled={isSaving} />
          <div className="space-y-2">
            <Label htmlFor="campaign-description">{t("settings.descriptionLabel")}</Label>
            <Textarea id="campaign-description" value={fields.description} onChange={(e) => set("description", e.target.value)} disabled={isSaving} rows={3} />
          </div>
        </div>
      </HudSection>
      <HudSection title={t("settings.rules")}>
        <div className="space-y-4">
          <div className="grid grid-cols-3 items-end gap-2 sm:grid-cols-4">
            <LabeledInput
              id="campaign-max-level"
              label={t("settings.maxLevel")}
              labelClassName="text-xs leading-tight"
              type="number"
              min="1"
              max="30"
              value={fields.maxLevel}
              onChange={(e) => set("maxLevel", parseInt(e.target.value) || 1)}
              disabled={isSaving}
            />
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox id="allow-player-edit" checked={fields.allowPlayerEdit} onCheckedChange={(v) => set("allowPlayerEdit", v === true)} disabled={isSaving} />
            <Label htmlFor="allow-player-edit">{t("settings.allowPlayerEdit")}</Label>
          </div>
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <Checkbox id="crit-choice-by-dm" checked={fields.critChoiceByDm} onCheckedChange={(v) => set("critChoiceByDm", v === true)} disabled={isSaving} />
              <Label htmlFor="crit-choice-by-dm">{t("settings.critChoiceByDm")}</Label>
            </div>
            <p className="text-xs text-hud-muted">{t("settings.critChoiceHint")}</p>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox id="acquaintances-enabled" checked={fields.acquaintancesEnabled} onCheckedChange={(v) => set("acquaintancesEnabled", v === true)} disabled={isSaving} />
            <Label htmlFor="acquaintances-enabled">{t("settings.acquaintances")}</Label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox id="campaign-status" checked={fields.status === CampaignStatus.ACTIVE} onCheckedChange={(v) => set("status", v === true ? CampaignStatus.ACTIVE : CampaignStatus.ARCHIVED)} disabled={isSaving} />
            <Label htmlFor="campaign-status">{t("settings.active")}</Label>
          </div>
        </div>
      </HudSection>
      <HudSection title={t("settings.templates")}>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={() => {
              onOpenChange(false);
              setTemplateOpen(true);
            }}
            disabled={isSaving}
          >
            {t("settings.saveAsTemplate")}
          </Button>
          {meta.createdFromId && (
            <Button
              variant="outline"
              onClick={() => {
                onOpenChange(false);
                setSyncOpen(true);
              }}
              disabled={isSaving}
            >
              {t(`sourceSync.title.${syncTitleKey(meta.isTemplate)}`)}
            </Button>
          )}
          <Button variant="outline" asChild>
            <a href={exportUrl} download>
              {t("settings.export")}
            </a>
          </Button>
        </div>
      </HudSection>
      {meta.credits && (
        <HudSection title={t("settings.credits")}>
          <CreditsText credits={meta.credits} />
        </HudSection>
      )}
      <HudSection title={t("settings.danger")}>
        <Button variant="destructive" onClick={handleDelete} disabled={isSaving}>
          {remove.isPending ? t("settings.deleting") : t("settings.delete")}
        </Button>
      </HudSection>
      {error && (
        <FormAlert className="mt-4">{error}</FormAlert>
      )}
    </ResponsiveDialog>
    <SaveAsTemplateDialog campaignId={campaignId} defaultName={t("settings.defaultTemplateName", { name: campaign.name })} open={templateOpen} onOpenChange={setTemplateOpen} />
    <SourceSyncDialog campaignId={campaignId} isTemplate={meta.isTemplate} open={syncOpen} onOpenChange={setSyncOpen} />
    </>
  );
}
