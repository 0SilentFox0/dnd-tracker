import { useId } from "react";

import { BoundedNumberInput } from "@/components/ui/bounded-number-input";
import { FormField } from "@/components/ui/labeled-input";

interface NumberFieldProps {
  label: string;
  value: number;
  range: [min: number, max: number];
  onCommit: (value: number) => void;
  disabled?: boolean;
  description?: string;
  decimal?: boolean;
}

export function NumberField({ label, value, range, onCommit, disabled, description, decimal }: NumberFieldProps) {
  const id = useId();

  return (
    <FormField label={label} htmlFor={id} description={description}>
      <BoundedNumberInput id={id} value={value} min={range[0]} max={range[1]} onCommit={onCommit} disabled={disabled} decimal={decimal} />
    </FormField>
  );
}
