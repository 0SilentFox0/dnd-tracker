"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import { EntityIcon } from "@/components/common/EntityIcon";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/ui/labeled-input";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import { useUpdateCampaignRules } from "@/lib/hooks/campaigns";
import { useGroupLabel } from "@/lib/hooks/units";
import { isHttpUrl } from "@/lib/utils/common/image-url";
import type { UnitRaceGroup } from "@/lib/utils/units/group-units";

export function UnitGroupDialog({ campaignId, group, onClose }: { campaignId: string; group: UnitRaceGroup; onClose: () => void }) {
  const t = useTranslations("units.groupDialog");

  const ta = useTranslations("common.actions");

  const title = useGroupLabel()(group);

  const update = useUpdateCampaignRules(campaignId);

  const [name, setName] = useState(title);

  const [icon, setIcon] = useState(group.customIcon ?? "");

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();

    try {
      await update.mutateAsync({ encounters: { unitGroups: { [group.key]: { name: name.trim() === title ? group.customName : name.trim(), icon: icon.trim() || null } } } });
      onClose();
    } catch {
      // Keep the form open; the mutation error is shown below.
    }
  };

  return (
    <ResponsiveDialog
      open
      onOpenChange={(open) => !open && onClose()}
      title={t("title")}
      description={t("description")}
      size="sm"
      hud
      footer={
        <>
          <Button type="button" variant="outline" onClick={onClose}>{ta("cancel")}</Button>
          <Button type="submit" form="unit-group-form" disabled={update.isPending || !name.trim() || (!!icon.trim() && !isHttpUrl(icon))}>
            {update.isPending ? ta("saving") : ta("save")}
          </Button>
        </>
      }
    >
      <form id="unit-group-form" onSubmit={submit} className="space-y-4">
        <FormField label={t("name")} htmlFor="unit-group-name" required>
          <Input id="unit-group-name" value={name} onChange={(event) => setName(event.target.value)} maxLength={100} required />
        </FormField>
        <FormField label={t("icon")} htmlFor="unit-group-icon">
          <div className="flex items-center gap-3">
            <EntityIcon src={icon.trim() || group.defaultIcon} name={name} className="size-16" />
            <Input id="unit-group-icon" type="url" value={icon} onChange={(event) => setIcon(event.target.value)} maxLength={2000} placeholder="https://example.com/icon.png" />
          </div>
        </FormField>
        <p className="text-sm text-muted-foreground">{t("iconHint")}</p>
        {update.isError && <p role="alert" className="text-sm text-destructive">{t("saveFailed")}</p>}
      </form>
    </ResponsiveDialog>
  );
}
