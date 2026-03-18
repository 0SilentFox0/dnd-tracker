"use client";

import type { SpellFormData } from "./spell-form-defaults";
import {
  SAVE_ABILITY_OPTIONS,
  SAVE_ON_SUCCESS_OPTIONS,
} from "./spell-form-defaults";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SelectField } from "@/components/ui/select-field";

export interface SpellFormSavingThrowProps {
  formData: SpellFormData;
  setFormData: (data: SpellFormData | ((prev: SpellFormData) => SpellFormData)) => void;
}

type SavingThrowObj = {
  ability: string;
  onSuccess: string;
  dc?: number | null;
};

export function SpellFormSavingThrow({
  formData,
  setFormData,
}: SpellFormSavingThrowProps) {
  const savingThrowObj: SavingThrowObj | null =
    formData.savingThrow &&
    typeof formData.savingThrow === "object" &&
    "ability" in formData.savingThrow
      ? (formData.savingThrow as SavingThrowObj)
      : null;

  return (
    <div>
      <Label>Збереження (Save)</Label>
      <div className="grid gap-4 md:grid-cols-3 mt-2">
        <div>
          <Label htmlFor="savingThrowAbility">Характеристика</Label>
          <SelectField
            id="savingThrowAbility"
            value={savingThrowObj ? String(savingThrowObj.ability) : ""}
            onValueChange={(value) =>
              setFormData({
                ...formData,
                savingThrow: {
                  ability: value,
                  onSuccess:
                    (savingThrowObj && "onSuccess" in savingThrowObj
                      ? String(savingThrowObj.onSuccess)
                      : "half") as "half" | "none",
                  dc: savingThrowObj?.dc ?? null,
                },
              })
            }
            placeholder="Виберіть характеристику"
            options={SAVE_ABILITY_OPTIONS.map((o) => ({
              value: o.value,
              label: o.label,
            }))}
          />
        </div>
        <div>
          <Label htmlFor="savingThrowDc">Складність (DC)</Label>
          <Input
            id="savingThrowDc"
            type="number"
            min={1}
            max={30}
            value={
              savingThrowObj && savingThrowObj.dc != null
                ? Number(savingThrowObj.dc)
                : ""
            }
            onChange={(e) => {
              const v = e.target.value;

              setFormData({
                ...formData,
                savingThrow: {
                  ability:
                    (savingThrowObj && String(savingThrowObj.ability)) ||
                    "strength",
                  onSuccess:
                    (savingThrowObj &&
                      "onSuccess" in savingThrowObj &&
                      String(savingThrowObj.onSuccess)) ||
                    "half",
                  dc: v === "" ? null : parseInt(v, 10) || null,
                },
              });
            }}
            placeholder="—"
          />
        </div>
        <div>
          <Label htmlFor="savingThrowOnSuccess">При успіху</Label>
          <SelectField
            id="savingThrowOnSuccess"
            value={
              savingThrowObj && "onSuccess" in savingThrowObj
                ? String(savingThrowObj.onSuccess)
                : ""
            }
            onValueChange={(value) =>
              setFormData({
                ...formData,
                savingThrow: {
                  ability:
                    (savingThrowObj && String(savingThrowObj.ability)) ||
                    "strength",
                  onSuccess: value as "half" | "none",
                  dc: savingThrowObj?.dc ?? null,
                },
              })
            }
            placeholder="Виберіть ефект"
            options={SAVE_ON_SUCCESS_OPTIONS.map((o) => ({
              value: o.value,
              label: o.label,
            }))}
          />
        </div>
      </div>
    </div>
  );
}
