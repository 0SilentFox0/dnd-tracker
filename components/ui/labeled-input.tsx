"use client";

import * as React from "react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface LabeledInputProps extends React.ComponentProps<typeof Input> {
  label: string;
  /** Додатковий вміст після підпису (наприклад, дельта від артефактів). */
  labelExtra?: React.ReactNode;
  description?: string;
  error?: string;
  required?: boolean;
  containerClassName?: string;
  labelClassName?: string;
}

export function LabeledInput({
  label,
  labelExtra,
  description,
  error,
  required = false,
  containerClassName,
  labelClassName,
  id,
  className,
  ...inputProps
}: LabeledInputProps) {
  const inputId = id || `input-${label.toLowerCase().replace(/\s+/g, "-")}`;

  return (
    <div className={cn("space-y-2", containerClassName)}>
      <Label htmlFor={inputId} className={labelClassName}>
        {label}
        {labelExtra}
        {required && <span className="text-destructive ml-1">*</span>}
      </Label>
      <Input id={inputId} className={className} {...inputProps} />
      {description && (
        <p className="text-xs text-muted-foreground">{description}</p>
      )}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
