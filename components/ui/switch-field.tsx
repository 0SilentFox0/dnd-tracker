"use client";

import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

interface SwitchFieldProps {
  id: string;
  label: React.ReactNode;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  description?: string;
  className?: string;
  ariaLabel?: string;
}

export function SwitchField({ id, label, checked, onCheckedChange, disabled, description, className, ariaLabel }: SwitchFieldProps) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <Switch id={id} aria-label={ariaLabel} checked={checked} onCheckedChange={onCheckedChange} disabled={disabled} />
      <div className="space-y-0.5">
        <Label htmlFor={id}>{label}</Label>
        {description && <p className="text-xs text-muted-foreground">{description}</p>}
      </div>
    </div>
  );
}
