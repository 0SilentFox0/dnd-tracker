"use client";

import { useEffect } from "react";

import type { SpellFormFieldsProps } from "./SpellFormBasicFields";

import { HudSection } from "@/components/hud/form";
import { BoundedNumberInput } from "@/components/ui/bounded-number-input";
import { Label } from "@/components/ui/label";
import { SelectField } from "@/components/ui/select-field";
import { useTranslator } from "@/lib/i18n/use-translator";
import type { SystemConditionInfo } from "@/lib/utils/rules/systems";
import { asMagicSpell, DEFAULT_SPELL_MAGIC, withSpellMagic } from "@/lib/utils/spells/model/form";
import { SPELL_MAGIC_KINDS } from "@/lib/utils/spells/model/schema";

export interface SpellMagicFieldsSystem {
  conditions: readonly SystemConditionInfo[];
}

const OVERCAST_KEYS = ["none", "dice", "targets"] as const;

const MAX_ATTRIBUTE_LEVELS = 3;

export function SpellMagicFields({ formData, setFormData, conditions }: SpellFormFieldsProps & SpellMagicFieldsSystem) {
  const t = useTranslator();

  const magic = formData.casting?.magic ?? DEFAULT_SPELL_MAGIC;

  const needsNormalising = !formData.casting?.magic || formData.resolution.kind !== "auto" || formData.cost === "long";

  useEffect(() => {
    if (needsNormalising) setFormData(asMagicSpell(formData));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [needsNormalising]);

  const te = (key: string) => t(`wfrpMagic.ui.editor.${key}`);

  const set = (patch: Partial<typeof magic>) => setFormData(withSpellMagic(formData, { ...magic, ...patch }));

  const condition = conditions.find((c) => c.key === magic.attribute?.condition);

  const levelCap = Math.min(condition?.maxLevel ?? 1, MAX_ATTRIBUTE_LEVELS);

  return (
    <div className="col-span-2">
      <HudSection title={te("title")}>
        <div className="grid grid-cols-2 gap-4 [&>*]:min-w-0">
          <div>
            <Label htmlFor="magic-cn">{te("cn")}</Label>
            <BoundedNumberInput id="magic-cn" min={0} max={30} value={magic.cn} onCommit={(cn) => set({ cn })} className="w-24" />
          </div>
          <div>
            <Label htmlFor="magic-kind">{te("kind")}</Label>
            <SelectField id="magic-kind" value={magic.kind} onValueChange={(kind) => set({ kind: kind as typeof magic.kind })} placeholder={te("kind")} options={SPELL_MAGIC_KINDS.map((k) => ({ value: k, label: t(`wfrpMagic.ui.kind.${k}`) }))} />
          </div>
          <div>
            <Label htmlFor="magic-overcast">{te("overcast")}</Label>
            <SelectField
              id="magic-overcast"
              value={magic.overcast ?? "none"}
              onValueChange={(v) => set({ overcast: v === "none" ? null : (v as "dice" | "targets") })}
              placeholder={te("overcast")}
              options={OVERCAST_KEYS.filter((k) => k !== "targets" || magic.overcast === "targets").map((k) => ({ value: k, label: te(`overcast${k[0].toUpperCase()}${k.slice(1)}`) }))}
            />
          </div>
          <div>
            <Label htmlFor="magic-attribute">{te("attribute")}</Label>
            <SelectField
              id="magic-attribute"
              value={magic.attribute?.condition ?? ""}
              onValueChange={(key) => set({ attribute: key ? { condition: key, levels: 1 } : undefined })}
              placeholder={te("attribute")}
              options={conditions.map((c) => ({ value: c.key, label: te(`condition.${c.key}`) }))}
              allowNone
              noneLabel={te("attributeNone")}
            />
          </div>
          {magic.attribute && levelCap > 1 && (
            <div>
              <Label htmlFor="magic-attribute-levels">{te("attributeLevels")}</Label>
              <BoundedNumberInput id="magic-attribute-levels" min={1} max={levelCap} value={magic.attribute.levels} onCommit={(levels) => set({ attribute: { condition: magic.attribute?.condition ?? "", levels } })} className="w-24" />
            </div>
          )}
        </div>
      </HudSection>
    </div>
  );
}
