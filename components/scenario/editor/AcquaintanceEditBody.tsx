"use client";

import { useTranslations } from "next-intl";

import { canSubmit, FORM_ID, payload, type Section, sectionTitle, useFields } from "./acquaintance-fields";
import type { AcquaintanceDialogTarget } from "./acquaintance-target";
import { AcquaintanceForm } from "./AcquaintanceForm";
import { AcquaintanceJournal } from "./AcquaintanceJournal";

import { Button } from "@/components/ui/button";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import { useAcquaintanceActions, useAcquaintances } from "@/lib/hooks/acquaintances";
import { useConfirm } from "@/lib/hooks/common";

interface Props {
  campaignId: string;
  target: Extract<AcquaintanceDialogTarget, { mode: "edit" }>;
  sections: Section[];
  onClose: () => void;
}

export function AcquaintanceEditBody({ campaignId, target, sections, onClose }: Props) {
  const t = useTranslations("scenario.acquaintance");

  const tActions = useTranslations("common.actions");

  const { data } = useAcquaintances(campaignId);

  const { update, remove } = useAcquaintanceActions(campaignId);

  const confirm = useConfirm();

  const item = data?.items.find((a) => a.id === target.id);

  const [fields, change] = useFields({ kind: item?.kind ?? "micro", characterId: item?.characterId ?? "", name: item?.name ?? "", description: item?.description ?? "", avatarUrl: item?.avatarUrl ?? "" });

  const save = async () => {
    const saved = await update.mutateAsync({ id: target.id, data: payload(fields) }).catch(() => null);

    if (saved) onClose();
  };

  const destroy = async () => {
    if (!(await confirm({ title: t("deleteTitle"), description: t("deleteDescription"), confirmLabel: tActions("delete") }))) return;

    if (await remove.mutateAsync(target.id).then(() => true, () => false)) onClose();
  };

  return (
    <ResponsiveDialog
      hud
      open
      onOpenChange={(open) => !open && onClose()}
      title={t("title")}
      footer={
        <>
          <Button type="button" variant="destructive" onClick={() => void destroy()}>
            {t("delete")}
          </Button>
          <Button type="button" variant="outline" onClick={onClose}>
            {tActions("cancel")}
          </Button>
          <Button type="submit" form={FORM_ID} disabled={!item || !canSubmit(fields) || update.isPending}>
            {tActions("save")}
          </Button>
        </>
      }
    >
      {!item ? (
        <p className="text-sm text-hud-muted">{t("notFound")}</p>
      ) : (
        <div className="space-y-4">
          <p className="text-xs text-hud-muted">{t("source", { section: sectionTitle(sections, item.sourcePageId, item.sourceSectionId, target.pageId, t("otherPage")) })}</p>
          <AcquaintanceForm campaignId={campaignId} fields={fields} onChange={change} onSubmit={() => void save()} />
          <AcquaintanceJournal campaignId={campaignId} item={item} target={target} sections={sections} />
        </div>
      )}
    </ResponsiveDialog>
  );
}
