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
  children?: React.ReactNode; // Для кастомного контенту (наприклад, групи)
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
  const handleValueChange = (newValue: string) => {
    if (allowNone && newValue === noneValue) {
      onValueChange("");
    } else {
      onValueChange(newValue);
    }
  };

  const displayValue = value || (allowNone ? noneValue : "");

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
