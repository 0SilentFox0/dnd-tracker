import { LabeledInput } from "@/components/ui/labeled-input";

interface NumberFieldProps {
  id: string;
  label: string;
  value: number | undefined;
  onChange: (value: number | undefined) => void;
  min?: number;
  max?: number;
}

export function NumberField({ id, label, value, onChange, min = 0, max }: NumberFieldProps) {
  return <LabeledInput id={id} label={label} type="number" inputMode="numeric" className="min-h-11" min={min} max={max} value={value ?? ""} onChange={(e) => onChange(e.target.value === "" ? undefined : Number(e.target.value))} />;
}
