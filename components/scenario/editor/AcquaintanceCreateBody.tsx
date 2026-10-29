"use client";

import { useTranslations } from "next-intl";

import { canSubmit, FORM_ID, payload, useFields } from "./acquaintance-fields";
import type { AcquaintanceDialogTarget } from "./acquaintance-target";
import { AcquaintanceExistingList } from "./AcquaintanceExistingList";
import { AcquaintanceForm } from "./AcquaintanceForm";

import { Button } from "@/components/ui/button";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import { useAcquaintanceActions, useAcquaintances } from "@/lib/hooks/acquaintances";

interface Props {
  campaignId: string;
  target: Extract<AcquaintanceDialogTarget, { mode: "create" }>;
  onInsert: (mention: { id: string; label: string }) => void;
  onClose: () => void;
}

export function AcquaintanceCreateBody({ campaignId, target, onInsert, onClose }: Props) {
  const t = useTranslations("scenario.acquaintance");

  const tActions = useTranslations("common.actions");

  const { data } = useAcquaintances(campaignId);

  const { create } = useAcquaintanceActions(campaignId);

  const [fields, change] = useFields({ kind: "micro", characterId: "", name: target.name, description: "", avatarUrl: "" });

  const submit = async () => {
    const created = await create.mutateAsync({ ...payload(fields), sourcePageId: target.pageId, sourceSectionId: target.sectionId }).catch(() => null);

    if (!created) return;

    onInsert({ id: created.id, label: created.name });
    onClose();
  };

  return (
    <ResponsiveDialog
      hud
      open
      onOpenChange={(open) => !open && onClose()}
      title={t("title")}
      footer={
        <>
          <Button type="button" variant="outline" onClick={onClose}>
            {tActions("cancel")}
          </Button>
          <Button type="submit" form={FORM_ID} disabled={!canSubmit(fields) || create.isPending}>
            {tActions("create")}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <AcquaintanceExistingList items={data?.items ?? []} onPick={(a) => { onInsert({ id: a.id, label: a.name }); onClose(); }} />
        <AcquaintanceForm campaignId={campaignId} fields={fields} onChange={change} onSubmit={() => void submit()} />
      </div>
    </ResponsiveDialog>
  );
}
