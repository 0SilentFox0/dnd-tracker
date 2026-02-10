"use client";

import * as React from "react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useReadOnly } from "@/components/ui/read-only-context";
import { cn } from "@/lib/utils";

interface LabeledInputProps extends React.ComponentProps<typeof Input> {
  label: string;
  description?: string;
  error?: string;
  required?: boolean;
  containerClassName?: string;
}

export function LabeledInput({
  label,
  description,
  error,
  required = false,
  containerClassName,
  id,
  className,
  ...inputProps
}: LabeledInputProps) {
  const inputId = id || `input-${label.toLowerCase().replace(/\s+/g, "-")}`;
  const readOnly = useReadOnly();

  return (
    <div className={cn("space-y-2", containerClassName)}>
      <Label htmlFor={readOnly ? undefined : inputId}>
        {label}
        {required && <span className="text-destructive ml-1">*</span>}
      </Label>
      <Input id={inputId} className={className} {...inputProps} />
      {description && !readOnly && (
        <p className="text-xs text-muted-foreground">{description}</p>
      )}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
