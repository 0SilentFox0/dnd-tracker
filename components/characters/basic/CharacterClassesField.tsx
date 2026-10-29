"use client";

import { useTranslations } from "next-intl";
import { X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SelectField } from "@/components/ui/select-field";
import { MAX_CLASS_LEVEL } from "@/lib/constants/classes";
import { classesById, classTotalLevel, hitDiceLabel } from "@/lib/utils/characters/classes";
import { resolveClassEntries } from "@/lib/utils/spells/class-slots";
import type { CharacterClassEntry, GameClassData } from "@/types/classes";

interface CharacterClassesFieldProps {
  value: CharacterClassEntry[];
  classes: GameClassData[];
  onChange: (entries: CharacterClassEntry[]) => void;
}

export function CharacterClassesField({ value, classes, onChange }: CharacterClassesFieldProps) {
  const t = useTranslations("characters.form.classes");

  const resolved = resolveClassEntries(value, classesById(classes));

  const free = classes.find((c) => !value.some((e) => e.classId === c.id));

  const patch = (index: number, change: Partial<CharacterClassEntry>) => onChange(value.map((e, i) => (i === index ? { ...e, ...change } : e)));

  const hint = resolved.find((e) => e.class)?.class?.skillChoices;

  return (
    <div className="col-span-2 space-y-3">
      {resolved.map((entry, i) => {
        const cls = entry.class;

        const subclassOff = !cls || cls.subclassLevel === null || entry.level < cls.subclassLevel;

        return (
          <div key={i} className="space-y-1">
            <div className="grid grid-cols-[1fr_1fr_4.5rem_auto] items-center gap-2">
              <SelectField
                aria-label={t("classN", { n: i + 1 })}
                value={entry.classId}
                onValueChange={(classId) => classId && classId !== entry.classId && patch(i, { classId, subclassId: null })}
                placeholder={t("class")}
                options={classes.filter((c) => c.id === entry.classId || !value.some((e) => e.classId === c.id)).map((c) => ({ value: c.id, label: c.name }))}
                triggerClassName="w-full"
              />
              <SelectField
                aria-label={t("subclassN", { n: i + 1 })}
                value={entry.subclassId ?? ""}
                onValueChange={(subclassId) => patch(i, { subclassId: subclassId || null })}
                placeholder={t("subclass")}
                options={(cls?.subclasses ?? []).map((s) => ({ value: s.id, label: s.name }))}
                disabled={subclassOff}
                allowNone
                noneLabel={t("noSubclass")}
                triggerClassName="w-full"
              />
              <Input
                type="number"
                min={1}
                max={MAX_CLASS_LEVEL}
                aria-label={t("levelN", { n: i + 1 })}
                value={entry.level}
                onChange={(e) => patch(i, { level: Math.min(MAX_CLASS_LEVEL, Math.max(1, parseInt(e.target.value) || 1)) })}
              />
              <Button type="button" variant="ghost" size="icon" aria-label={t("removeN", { n: i + 1 })} onClick={() => onChange(value.filter((_, j) => j !== i))}>
                <X className="size-4" />
              </Button>
            </div>
            {!cls && <p className="text-xs text-destructive">{t("notFound")}</p>}
            {cls && cls.subclassLevel !== null && entry.level < cls.subclassLevel && <p className="text-xs text-muted-foreground">{t("fromLevel", { level: cls.subclassLevel })}</p>}
          </div>
        );
      })}
      <Button type="button" variant="outline" size="sm" disabled={!free} onClick={() => free && onChange([...value, { classId: free.id, level: 1 }])}>
        {t("add")}
      </Button>
      {value.length > 0 && (
        <div className="space-y-0.5 text-sm text-muted-foreground">
          <p>{t("totalLevel", { level: classTotalLevel(value) })}</p>
          <p>{t("hitDice", { dice: hitDiceLabel(resolved) })}</p>
          {hint && hint.count > 0 && <p>{t("skillChoice", { count: hint.count, from: hint.from.join(", ") })}</p>}
        </div>
      )}
    </div>
  );
}
