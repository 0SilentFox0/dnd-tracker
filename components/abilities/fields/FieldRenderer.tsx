"use client";

import { AmountField } from "./AmountField";
import { DistanceDiceField } from "./DistanceDiceField";
import { DurationField } from "./DurationField";
import { FlatField } from "./FlatField";
import { MultiSelectField } from "./MultiSelectField";
import { NumberField } from "./NumberField";
import { NumberListField } from "./NumberListField";
import { SaveEndsField } from "./SaveEndsField";
import { SelectInput } from "./SelectInput";
import { SpellPickerField } from "./SpellPickerField";
import { TextField } from "./TextField";
import { ToggleField } from "./ToggleField";
import { UnitPickerField } from "./UnitPickerField";

import { useErrorsUnder } from "@/components/abilities/editor-context";
import { FieldErrors } from "@/components/abilities/FieldErrors";
import { localizeField } from "@/components/abilities/fields/registry-labels";
import { Label } from "@/components/ui/label";
import { useTranslator } from "@/lib/i18n/use-translator";
import type { FieldMeta } from "@/lib/utils/abilities/registry/fields";
import { TARGET_LABELS } from "@/lib/utils/abilities/registry/labels";

export interface FieldProps<V = unknown> {
  id: string;
  value: V;
  onChange: (v: V | undefined) => void;
  meta: FieldMeta;
}

interface FieldRendererProps {
  meta: FieldMeta;
  value: unknown;
  onChange: (v: unknown) => void;
  path: string;
  /** Registry key of the effect/flag/trigger/condition the field belongs to; omitted when `meta` is already translated. */
  owner?: string;
}

export function FieldRenderer({ meta: rawMeta, value, onChange, path, owner }: FieldRendererProps) {
  const tr = useTranslator("abilityRegistry");

  const errors = useErrorsUnder(path);

  const meta = owner ? localizeField(tr, owner, rawMeta) : rawMeta;

  const targetOptions = Object.keys(TARGET_LABELS).map((value) => ({ value, label: tr(`targets.${value}`) }));

  const props = { id: path, value: value as never, onChange, meta };

  const input = (() => {
    switch (meta.input) {
      case "number":
        return <NumberField {...props} />;
      case "text":
      case "strings":
        return <TextField {...props} />;
      case "select":
        return <SelectInput {...props} />;
      case "target":
        return <SelectInput {...props} meta={{ ...meta, options: targetOptions, optional: true }} />;
      case "multiselect":
        return <MultiSelectField {...props} />;
      case "toggle":
        return <ToggleField {...props} />;
      case "amount":
        return <AmountField {...props} />;
      case "flat":
        return <FlatField {...props} />;
      case "duration":
        return <DurationField {...props} />;
      case "numberList":
        return <NumberListField {...props} />;
      case "distanceDice":
        return <DistanceDiceField {...props} />;
      case "spells":
        return <SpellPickerField {...props} />;
      case "saveEnds":
        return <SaveEndsField {...props} />;
      case "unit":
        return <UnitPickerField {...props} />;
      default:
        return null;
    }
  })();

  const compact = meta.input === "number" || meta.input === "duration";

  return (
    <div className={compact ? "col-span-2 flex flex-col justify-end space-y-1" : "col-span-3 space-y-1"}>
      <Label htmlFor={path} className={compact ? "text-xs leading-tight text-muted-foreground" : "text-xs text-muted-foreground"}>
        {meta.label}
      </Label>
      {input}
      <FieldErrors errors={errors} testId={`field-errors-${path}`} />
    </div>
  );
}
