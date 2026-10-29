"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import { CharacterSelect } from "./CharacterSelect";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import { SelectField } from "@/components/ui/select-field";
import { PAGE_KINDS } from "@/lib/constants/scenario";
import type { CreateScenarioPageData, ScenarioPageKind } from "@/types/scenario";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaignId: string;
  pending: boolean;
  onSubmit: (data: CreateScenarioPageData) => void;
};

export function CreateScenarioPageDialog({ open, onOpenChange, campaignId, pending, onSubmit }: Props) {
  const t = useTranslations("scenario.create");

  const tKinds = useTranslations("scenario.pageKinds");

  const kindOptions = PAGE_KINDS.map((k) => ({ value: k, label: tKinds(k) }));

  const [kind, setKind] = useState<ScenarioPageKind>("scene");

  const [title, setTitle] = useState("");

  const [arc, setArc] = useState("");

  const [characterId, setCharacterId] = useState("");

  return (
    <ResponsiveDialog
      hud
      open={open}
      onOpenChange={onOpenChange}
      title={t("title")}
      footer={
        <Button type="submit" form="scenario-create-form" disabled={pending || !title.trim()}>
          {t("submit")}
        </Button>
      }
    >
      <form
        id="scenario-create-form"
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit({ kind, title: title.trim(), arc: kind === "scene" ? arc.trim() || null : null, characterId: kind === "hero" ? characterId || null : null });
        }}
      >
        <div className="space-y-1.5">
          <Label htmlFor="scenario-kind">{t("kind")}</Label>
          <SelectField id="scenario-kind" value={kind} onValueChange={(v) => setKind(v as ScenarioPageKind)} options={kindOptions} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="scenario-title">{t("name")}</Label>
          <Input id="scenario-title" required value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} />
        </div>
        {kind === "scene" && (
          <div className="space-y-1.5">
            <Label htmlFor="scenario-arc">{t("arc")}</Label>
            <Input id="scenario-arc" value={arc} onChange={(e) => setArc(e.target.value)} placeholder={t("arcPlaceholder")} maxLength={120} />
          </div>
        )}
        {kind === "hero" && (
          <div className="space-y-1.5">
            <Label htmlFor="scenario-character">{t("character")}</Label>
            <CharacterSelect campaignId={campaignId} id="scenario-character" value={characterId} onValueChange={setCharacterId} enabled={open} />
          </div>
        )}
      </form>
    </ResponsiveDialog>
  );
}
