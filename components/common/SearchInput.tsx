"use client";

import { useTranslations } from "next-intl";
import { Search, X } from "lucide-react";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  label: string;
  placeholder?: string;
  className?: string;
}

export function SearchInput({ value, onChange, label, placeholder, className }: SearchInputProps) {
  const t = useTranslations("common.search");

  return (
    <div className={cn("relative", className)}>
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-hud-muted" aria-hidden />
      <Input type="search" aria-label={label} placeholder={placeholder ?? t("placeholder")} value={value} onChange={(e) => onChange(e.target.value)} className="pl-9 pr-9 [&::-webkit-search-cancel-button]:hidden" />
      {value ? (
        <button type="button" aria-label={t("clear")} onClick={() => onChange("")} className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-hud-muted hover:text-foreground">
          <X className="h-4 w-4" aria-hidden />
        </button>
      ) : null}
    </div>
  );
}
