"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Info } from "lucide-react";

import { RequirementList } from "@/components/choices/RequirementList";
import { EntityIcon } from "@/components/common/EntityIcon";
import { OptionButton } from "@/components/hud/OptionButton";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import { cn } from "@/lib/utils";
import type { Requirement } from "@/lib/utils/characters/choices/requirements";

interface DetailsButtonProps {
  title: string;
  text: string;
  className?: string;
}

export function DetailsButton({ title, text, className }: DetailsButtonProps) {
  const t = useTranslations("choices");

  const [open, setOpen] = useState(false);

  return (
    <>
      <button type="button" aria-label={t("picker.details")} onClick={(e) => { e.stopPropagation(); setOpen(true); }} className={cn("rounded p-1 text-hud-gold hover:bg-hud-line/20", className)}>
        <Info className="size-4" aria-hidden="true" />
      </button>
      <ResponsiveDialog hud open={open} onOpenChange={setOpen} title={title}>
        <p className="whitespace-pre-line text-sm">{text}</p>
      </ResponsiveDialog>
    </>
  );
}

interface ChoiceCardProps {
  role: "checkbox" | "radio";
  checked: boolean;
  disabled?: boolean;
  title: string;
  name: string;
  summary: string;
  description?: string;
  requirements?: Requirement[];
  requirementNames?: Record<string, string>;
  note?: string;
  onClick: () => void;
}

export function ChoiceCard({ role, checked, disabled, title, name, summary, description, requirements, requirementNames, note, onClick }: ChoiceCardProps) {
  return (
    <div className="relative">
      <OptionButton
        variant="form"
        role={role}
        checked={checked}
        disabled={disabled}
        onClick={onClick}
        className={description ? "pr-9" : undefined}
        title={
          <span className="flex items-center gap-2">
            <EntityIcon name={name} className="size-7 text-xs" />
            {title}
          </span>
        }
        note={
          (summary || note) && (
            <>
              {summary}
              {note && <span className="block text-hud-danger">{note}</span>}
            </>
          )
        }
      />
      {description && <DetailsButton title={name} text={description} className="absolute right-1 top-1" />}
      <RequirementList items={requirements ?? []} names={requirementNames} />
    </div>
  );
}
