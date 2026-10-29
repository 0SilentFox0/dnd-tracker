"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import { useProfile } from "../ProfileContext";
import { ResourcesDialog } from "./ResourcesDialog";

import { Button } from "@/components/ui/button";
import { SwitchField } from "@/components/ui/switch-field";
import { useInspiration } from "@/lib/hooks/characters";
import type { SheetRest } from "@/types/characters";

export function DmRestActions() {
  const { sheet } = useProfile();

  if (!sheet.rest || !sheet.viewer.isDM) return null;

  return <DmRestControls rest={sheet.rest} />;
}

function DmRestControls({ rest }: { rest: SheetRest }) {
  const t = useTranslations("rest.dm");

  const { campaignId, characterId } = useProfile();

  const inspiration = useInspiration(campaignId, characterId);

  const [open, setOpen] = useState(false);

  return (
    <>
      {rest.persist && (
        <Button type="button" size="sm" variant="outline" onClick={() => setOpen(true)}>
          {t("resources")}
        </Button>
      )}
      {rest.inspiration !== null && (
        <SwitchField id="dm-inspiration" label={t("inspiration")} checked={rest.inspiration} disabled={inspiration.isPending} onCheckedChange={(v) => void inspiration.mutateOk(v)} />
      )}
      {open && <ResourcesDialog rest={rest} open onOpenChange={setOpen} />}
    </>
  );
}
