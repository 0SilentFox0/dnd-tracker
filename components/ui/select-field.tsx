"use client";

import * as React from "react";
import { useTranslations } from "next-intl";

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
  "aria-label"?: string;
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

export function SelectField({
  id,
  "aria-label": ariaLabel,
  value,
  onValueChange,
  placeholder,
  options = [],
  groups,
  disabled = false,
  className,
  triggerClassName,
  required = false,
  allowNone = false,
  noneLabel,
  noneValue = "none",
  children,
}: SelectFieldProps) {
  const t = useTranslations("common");

  const displayValue = value || (allowNone ? noneValue : "");

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
      <SelectTrigger id={id} aria-label={ariaLabel} className={cn(triggerClassName, className)}>
        <SelectValue placeholder={placeholder ?? t("ui.selectPlaceholder")} />
      </SelectTrigger>
      <SelectContent>
        {children ? (
          children
        ) : (
          <>
            {allowNone && (
              <SelectItem value={noneValue}>{noneLabel ?? t("ui.noneLabel")}</SelectItem>
            )}
            {groups && groups.length > 0
              ? groups.map((group, groupIndex) => (
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
              : options.map((option) => (
                  <SelectItem
                    key={option.value}
                    value={option.value}
                    disabled={option.disabled}
                  >
                    {option.label}
                  </SelectItem>
                ))}
          </>
        )}
      </SelectContent>
      {/* Radix's hidden native select auto-picks its first option when value is "", so `required` never blocks submit */}
      {required && !disabled && !displayValue && (
        <input aria-hidden tabIndex={-1} required value="" onChange={() => {}} className="sr-only" />
      )}
    </Select>
  );
}
