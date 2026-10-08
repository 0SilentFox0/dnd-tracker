"use client";

import { AmountField } from "./AmountField";
import { DurationField } from "./DurationField";
import { FlatField } from "./FlatField";
import { MultiSelectField } from "./MultiSelectField";
import { NumberField } from "./NumberField";
import { NumberListField } from "./NumberListField";
import { SelectInput } from "./SelectInput";
import { SpellPickerField } from "./SpellPickerField";
import { TextField } from "./TextField";
import { ToggleField } from "./ToggleField";
import { UnitPickerField } from "./UnitPickerField";

import { useErrorsUnder } from "@/components/abilities/editor-context";
import { FieldErrors } from "@/components/abilities/FieldErrors";
import { Label } from "@/components/ui/label";
import type { FieldMeta } from "@/lib/utils/abilities/registry/fields";
import { TARGET_LABELS } from "@/lib/utils/abilities/registry/labels";

export interface FieldProps<V = unknown> {
  id: string;
  value: V;
  onChange: (v: V | undefined) => void;
  meta: FieldMeta;
}

const TARGET_OPTIONS = Object.entries(TARGET_LABELS).map(([value, label]) => ({ value, label }));

export function FieldRenderer({ meta, value, onChange, path }: { meta: FieldMeta; value: unknown; onChange: (v: unknown) => void; path: string }) {
  const errors = useErrorsUnder(path);

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
        return <SelectInput {...props} meta={{ ...meta, options: TARGET_OPTIONS, optional: true }} />;
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
      case "spells":
        return <SpellPickerField {...props} />;
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
