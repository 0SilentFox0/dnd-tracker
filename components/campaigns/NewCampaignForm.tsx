"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

import { TemplatePicker } from "@/components/campaigns/templates/TemplatePicker";
import { HudForm, HudFormPage, HudSection } from "@/components/hud/form";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { LabeledInput } from "@/components/ui/labeled-input";
import { Textarea } from "@/components/ui/textarea";
import { useCreateCampaign, useImportCampaign, useTemplateSelection } from "@/lib/hooks/campaigns";
import { useNotify } from "@/lib/hooks/common";
import { errorMessage } from "@/lib/utils/common/error-message";

export function NewCampaignForm() {
  const t = useTranslations("campaigns");

  const tc = useTranslations("common");

  const notify = useNotify();

  const router = useRouter();

  const [formData, setFormData] = useState({
    name: "",
    description: "",
  });

  const [settings, setSettings] = useState<{ maxLevel?: number; allowPlayerEdit?: boolean }>({});

  const { selection, setSelection, name: templateName, isLoading: templatesLoading } = useTemplateSelection();

  const create = useCreateCampaign();

  const importCampaign = useImportCampaign();

  const loading = create.isPending || importCampaign.isPending;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const options = {
      onSuccess: (campaign: { id: string; warnings?: string[] }) => {
        router.push(`/campaigns/${campaign.id}`);

        if (campaign.warnings?.length) void notify(t("form.warnings", { count: campaign.warnings.length }));
      },
      onError: (e: unknown) => void notify(errorMessage(e, t("form.createFailed"))),
    };

    if (selection.file) {
      importCampaign.mutate({ name: formData.name, bundle: selection.file.bundle }, options);

      return;
    }

    create.mutate({ ...formData, ...settings, templateId: selection.templateId ?? undefined }, options);
  };

  return (
    <HudFormPage title={t("form.title")} aside={t("form.aside")}>
      <HudForm
        id="campaign-form"
        onSubmit={handleSubmit}
        actions={
          <>
            <Button type="button" variant="outline" asChild>
              <Link href="/campaigns">{tc("actions.cancel")}</Link>
            </Button>
            <Button type="submit" disabled={loading || templatesLoading}>
              {loading ? tc("actions.creating") : t("form.submit")}
            </Button>
          </>
        }
      >
        <TemplatePicker value={selection} onChange={setSelection} />
        <HudSection title={t("form.campaign")}>
          <div className="space-y-4">
            <LabeledInput
              id="name"
              label={t("form.name")}
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              maxLength={100}
              placeholder={templateName ?? t("form.namePlaceholder")}
            />
            <div>
              <Label htmlFor="description">{t("form.description")}</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder={t("form.descriptionPlaceholder")}
                rows={3}
              />
            </div>
          </div>
        </HudSection>
        {!selection.file && (
        <HudSection title={t("form.rules")}>
          <div className="space-y-4">
            <div className="grid grid-cols-3 items-end gap-2 sm:grid-cols-4">
              <LabeledInput
                id="maxLevel"
                label={t("form.maxLevel")}
                labelClassName="text-xs leading-tight"
                type="number"
                min="1"
                max="30"
                value={settings.maxLevel ?? 20}
                onChange={(e) => setSettings({ ...settings, maxLevel: parseInt(e.target.value) || (settings.maxLevel ?? 20) })}
              />
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox id="allowPlayerEdit" checked={settings.allowPlayerEdit ?? true} onCheckedChange={(v) => setSettings({ ...settings, allowPlayerEdit: v === true })} />
              <Label htmlFor="allowPlayerEdit">{t("form.allowPlayerEdit")}</Label>
            </div>
          </div>
        </HudSection>
        )}
      </HudForm>
    </HudFormPage>
  );
}
