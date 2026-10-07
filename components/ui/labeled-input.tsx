"use client";

import * as React from "react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface FormFieldProps {
  label: string;
  htmlFor?: string;
  required?: boolean;
  description?: string;
  error?: string;
  /** Додатковий вміст після підпису (наприклад, дельта від артефактів). */
  labelExtra?: React.ReactNode;
  labelClassName?: string;
  className?: string;
  children: React.ReactNode;
}

export function FormField({ label, htmlFor, required = false, description, error, labelExtra, labelClassName, className, children }: FormFieldProps) {
  return (
    <div className={cn("space-y-2", className)}>
      <Label htmlFor={htmlFor} className={labelClassName}>
        {label}
        {labelExtra}
        {required && <span className="text-destructive ml-1">*</span>}
      </Label>
      {children}
      {description && <p className="text-xs text-muted-foreground">{description}</p>}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

interface LabeledInputProps extends React.ComponentProps<typeof Input>, Pick<FormFieldProps, "label" | "labelExtra" | "description" | "error" | "labelClassName"> {
  required?: boolean;
  containerClassName?: string;
}

export function LabeledInput({ label, labelExtra, description, error, required = false, containerClassName, labelClassName, id, className, ...inputProps }: LabeledInputProps) {
  const inputId = id || `input-${label.toLowerCase().replace(/\s+/g, "-")}`;

  return (
    <FormField label={label} htmlFor={inputId} required={required} description={description} error={error} labelExtra={labelExtra} labelClassName={labelClassName} className={containerClassName}>
      <Input id={inputId} className={className} {...inputProps} />
    </FormField>
  );
}
