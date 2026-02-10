"use client";

import * as React from "react";

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useReadOnly } from "@/components/ui/read-only-context";
import { cn } from "@/lib/utils";

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectOptionGroup {
  label: string;
  options: SelectOption[];
}

interface SelectFieldProps {
  id?: string;
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  options?: SelectOption[];
  groups?: SelectOptionGroup[];
  disabled?: boolean;
  className?: string;
  triggerClassName?: string;
  required?: boolean;
  allowNone?: boolean;
  noneLabel?: string;
  noneValue?: string;
  children?: React.ReactNode;
}

function findOptionLabel(
  value: string,
  options: SelectOption[],
  groups: SelectOptionGroup[] | undefined,
  allowNone: boolean,
  noneValue: string,
  noneLabel: string
): string {
  if (allowNone && (value === noneValue || !value)) return noneLabel;
  const allOptions = groups?.flatMap((g) => g.options) ?? options;
  const opt = allOptions.find((o) => o.value === value);
  return opt?.label ?? value ?? "";
}

export function SelectField({
  id,
  value,
  onValueChange,
  placeholder = "Виберіть опцію",
  options = [],
  groups,
  disabled = false,
  className,
  triggerClassName,
  required = false,
  allowNone = false,
  noneLabel = "Без вибору",
  noneValue = "none",
  children,
}: SelectFieldProps) {
  const readOnly = useReadOnly();

  const displayValue = value || (allowNone ? noneValue : "");
  const labelText = findOptionLabel(
    displayValue,
    options,
    groups,
    allowNone,
    noneValue,
    noneLabel
  );

  if (readOnly) {
    return (
      <span
        id={id}
        data-slot="select-field"
        className={cn(
          "text-foreground block min-h-9 w-full min-w-0 py-2 text-base md:text-sm",
          triggerClassName,
          className
        )}
      >
        {labelText || placeholder || "\u00A0"}
      </span>
    );
  }

  const handleValueChange = (newValue: string) => {
    if (allowNone && newValue === noneValue) {
      onValueChange("");
    } else {
      onValueChange(newValue);
    }
  };

  return (
    <Select
      value={displayValue}
      onValueChange={handleValueChange}
      disabled={disabled}
      required={required}
    >
      <SelectTrigger id={id} className={cn(triggerClassName, className)}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {children ? (
          children
        ) : (
          <>
            {allowNone && (
              <SelectItem value={noneValue}>{noneLabel}</SelectItem>
            )}
            {groups && groups.length > 0 ? (
              groups.map((group, groupIndex) => (
                <SelectGroup key={groupIndex}>
                  <SelectLabel>{group.label}</SelectLabel>
                  {group.options.map((option) => (
                    <SelectItem
                      key={option.value}
                      value={option.value}
                      disabled={option.disabled}
                    >
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              ))
            ) : (
              options.map((option) => (
                <SelectItem
                  key={option.value}
                  value={option.value}
                  disabled={option.disabled}
                >
                  {option.label}
                </SelectItem>
              ))
            )}
          </>
        )}
      </SelectContent>
    </Select>
  );
}
