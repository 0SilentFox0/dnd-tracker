import { Input } from "@/components/ui/input";
import { FormField } from "@/components/ui/labeled-input";

interface ColorFieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  description?: string;
  required?: boolean;
}

export function ColorField({ id, label, value, onChange, description, required }: ColorFieldProps) {
  return (
    <FormField label={label} htmlFor={id} required={required} description={description}>
      <div className="flex items-center gap-2">
        <Input id={id} type="color" value={value || "#888888"} onChange={(e) => onChange(e.target.value)} className="h-10 w-20" />
        <Input aria-label={`${label} (hex)`} value={value} onChange={(e) => onChange(e.target.value)} placeholder="#000000" className="flex-1" />
      </div>
    </FormField>
  );
}
