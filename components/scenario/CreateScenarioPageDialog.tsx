"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import { SelectField } from "@/components/ui/select-field";
import { PAGE_KIND_LABELS, PAGE_KINDS } from "@/lib/constants/scenario";
import type { CreateScenarioPageData, ScenarioPageKind } from "@/types/scenario";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  characters: { id: string; name: string }[];
  pending: boolean;
  onSubmit: (data: CreateScenarioPageData) => void;
};

const KIND_OPTIONS = PAGE_KINDS.map((k) => ({ value: k, label: PAGE_KIND_LABELS[k] }));

export function CreateScenarioPageDialog({ open, onOpenChange, characters, pending, onSubmit }: Props) {
  const [kind, setKind] = useState<ScenarioPageKind>("scene");

  const [title, setTitle] = useState("");

  const [arc, setArc] = useState("");

  const [characterId, setCharacterId] = useState("");

  return (
    <ResponsiveDialog
      hud
      open={open}
      onOpenChange={onOpenChange}
      title="Нова сторінка"
      footer={
        <Button type="submit" form="scenario-create-form" disabled={pending || !title.trim()}>
          Створити
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
          <Label htmlFor="scenario-kind">Тип</Label>
          <SelectField id="scenario-kind" value={kind} onValueChange={(v) => setKind(v as ScenarioPageKind)} options={KIND_OPTIONS} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="scenario-title">Назва</Label>
          <Input id="scenario-title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} />
        </div>
        {kind === "scene" && (
          <div className="space-y-1.5">
            <Label htmlFor="scenario-arc">Арка</Label>
            <Input id="scenario-arc" value={arc} onChange={(e) => setArc(e.target.value)} placeholder="Арка перша: Ізабель і Годрик" maxLength={120} />
          </div>
        )}
        {kind === "hero" && (
          <div className="space-y-1.5">
            <Label htmlFor="scenario-character">Персонаж</Label>
            <SelectField
              id="scenario-character"
              value={characterId}
              onValueChange={setCharacterId}
              options={characters.map((c) => ({ value: c.id, label: c.name }))}
              allowNone
              noneLabel="— без прив'язки —"
            />
          </div>
        )}
      </form>
    </ResponsiveDialog>
  );
}
