"use client";

import type { FormEvent } from "react";
import { useTranslations } from "next-intl";

import { type Fields, FORM_ID } from "./acquaintance-fields";

import { IconUrlField } from "@/components/common/IconUrlField";
import { CharacterSelect } from "@/components/scenario/CharacterSelect";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ACQUAINTANCE_LIMITS } from "@/lib/constants/acquaintances";
import { useCharacters } from "@/lib/hooks/characters";
import type { AcquaintanceKind } from "@/types/acquaintances";

const KINDS: AcquaintanceKind[] = ["micro", "character"];

export function AcquaintanceForm({ campaignId, fields, onChange, onSubmit }: { campaignId: string; fields: Fields; onChange: (patch: Partial<Fields>) => void; onSubmit: () => void }) {
  const t = useTranslations("scenario.acquaintance");

  const { data: roster = [] } = useCharacters(campaignId, { compact: true, enabled: fields.kind === "character" });

  const pickCharacter = (characterId: string) => onChange({ characterId, ...(!fields.name.trim() && { name: roster.find((c) => c.id === characterId)?.name ?? "" }) });

  const submit = (e: FormEvent) => {
    e.preventDefault();
    onSubmit();
  };

  return (
    <form id={FORM_ID} onSubmit={submit} className="space-y-3">
      <div className="flex gap-2" role="group" aria-label={t("kindGroup")}>
        {KINDS.map((kind) => (
          <Button key={kind} type="button" size="sm" variant={fields.kind === kind ? "secondary" : "outline"} aria-pressed={fields.kind === kind} onClick={() => onChange({ kind })}>
            {t(`kinds.${kind}`)}
          </Button>
        ))}
      </div>
      {fields.kind === "character" && (
        <div className="space-y-1">
          <Label htmlFor="acq-character">{t("character")}</Label>
          <CharacterSelect campaignId={campaignId} id="acq-character" value={fields.characterId} onValueChange={pickCharacter} />
        </div>
      )}
      <div className="space-y-1">
        <Label htmlFor="acq-name">{t("name")}</Label>
        <Input id="acq-name" value={fields.name} maxLength={ACQUAINTANCE_LIMITS.name} onChange={(e) => onChange({ name: e.target.value })} />
      </div>
      {fields.kind === "micro" && (
        <div className="space-y-1">
          <Label htmlFor="acq-description">{t("description")}</Label>
          <Textarea id="acq-description" value={fields.description} maxLength={ACQUAINTANCE_LIMITS.description} onChange={(e) => onChange({ description: e.target.value })} />
        </div>
      )}
      {fields.kind === "micro" && <IconUrlField id="acq-avatar" label={t("avatar")} value={fields.avatarUrl} onChange={(avatarUrl) => onChange({ avatarUrl })} fallbackText={fields.name} />}
    </form>
  );
}

