"use client";

import type { ReactNode } from "react";
import { useTranslations } from "next-intl";

import { EntityIcon } from "@/components/common/EntityIcon";
import { chosenSubclassId, pathSummary } from "@/lib/utils/characters/classes/path";
import type { ClassProgression } from "@/types/classes";

interface ClassSectionProps {
  progression: ClassProgression;
  defaultOpen: boolean;
  children: ReactNode;
}

export function ClassSection({ progression, defaultOpen, children }: ClassSectionProps) {
  const t = useTranslations("characterProfile.path");

  const { level } = pathSummary(progression);

  const chosen = chosenSubclassId(progression);

  const chosenSubclass = progression.subclasses.find((s) => s.id === chosen);

  const subclass = chosenSubclass?.name;

  return (
    <section className="mb-3">
      <details open={defaultOpen} className="space-y-2">
        <summary className="flex cursor-pointer flex-wrap items-baseline gap-2">
          <EntityIcon src={progression.icon} name={progression.className} className="size-6 text-xs" />
          <h3 className="inline">{progression.className}</h3>
          {level !== null ? <span className="text-sm text-hud-muted">{t("sectionLevel", { level })}</span> : null}
          {subclass ? (
            <span className="inline-flex items-center gap-1 text-sm text-hud-muted">
              <EntityIcon src={chosenSubclass?.icon} name={subclass} className="size-5 text-[10px]" />
              {t("sectionSubclass", { subclass })}
            </span>
          ) : null}
        </summary>
        <div className="mt-2 space-y-2">{children}</div>
      </details>
    </section>
  );
}
