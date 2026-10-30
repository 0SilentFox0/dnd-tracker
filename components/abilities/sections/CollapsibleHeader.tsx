"use client";

import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { ChevronDown, ChevronRight, Plus } from "lucide-react";

import { SectionTitle } from "./SectionTitle";

import { Button } from "@/components/ui/button";

interface CollapsibleHeaderProps {
  title: ReactNode;
  summary: string | null;
  open: boolean;
  onToggle: () => void;
  onAdd?: () => void;
  addLabel?: string;
  controlsId: string;
}

export function CollapsibleHeader({ title, summary, open, onToggle, onAdd, addLabel, controlsId }: CollapsibleHeaderProps) {
  const t = useTranslations("abilities.panel");

  const Chevron = open ? ChevronDown : ChevronRight;

  return (
    <div className="flex items-center gap-1">
      <button type="button" aria-expanded={open} aria-controls={controlsId} title={open ? t("collapse") : t("expand")} className="flex min-w-0 flex-1 items-center gap-1.5 rounded-sm text-left" onClick={onToggle}>
        <Chevron aria-hidden className="size-3.5 shrink-0 text-muted-foreground" />
        <SectionTitle>{title}</SectionTitle>
        {!open && (summary ? <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">{summary}</span> : <span className="text-xs text-muted-foreground/60">{t("emptySummary")}</span>)}
      </button>
      {onAdd && (
        <Button type="button" size="icon" variant="ghost" className="size-6" aria-label={addLabel} onClick={onAdd}>
          <Plus className="size-4" />
        </Button>
      )}
    </div>
  );
}
