"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight } from "lucide-react";

import { DM_SECTION_LABELS } from "@/lib/constants/campaigns";

const SEGMENT_LABELS: Record<string, string> = {
  ...DM_SECTION_LABELS,
  campaigns: "Кампанії",
  dm: "DM",
  character: "Персонаж",
  inventory: "Інвентар",
  new: "Створити",
  edit: "Редагувати",
  sets: "Сети",
  groups: "Групи",
  "main-skills": "Основні навики",
  info: "Довідник",
  print: "Друк",
  world: "Карта світу",
  show: "Показ",
  scenario: "Сценарій",
};

const ID_LABELS_BY_PARENT: Record<string, string> = {
  campaigns: "Кампанія",
  battles: "Бій",
  characters: "Персонаж",
  units: "Юніт",
  spells: "Заклинання",
  artifacts: "Артефакт",
  sets: "Сет",
};

function getLabel(segment: string, previous?: string) {
  if (SEGMENT_LABELS[segment]) return SEGMENT_LABELS[segment];

  if (previous && ID_LABELS_BY_PARENT[previous]) {
    return ID_LABELS_BY_PARENT[previous];
  }

  return "Деталі";
}

export function Breadcrumbs() {
  const pathname = usePathname();

  if (
    pathname?.startsWith("/sign-in") ||
    pathname?.startsWith("/sign-up") ||
    pathname === "/" ||
    pathname === "/uk"
  ) {
    return null;
  }

  const allSegments = pathname.split("/").filter(Boolean);

  if (allSegments.length === 0) return null;

  const crumbs: Array<{ href: string; label: string; isLast: boolean }> = [];

  let previousDisplaySegment: string | undefined;

  for (let i = 0; i < allSegments.length; i++) {
    const segment = allSegments[i];

    const isLastSegment = i === allSegments.length - 1;

    // dm/battles stay in hrefs but only get their own crumb when they are the page itself
    if (segment === "dm" || (segment === "battles" && !isLastSegment)) {
      previousDisplaySegment = segment;
      continue;
    }

    crumbs.push({
      href: `/${allSegments.slice(0, i + 1).join("/")}`,
      label: getLabel(segment, previousDisplaySegment),
      isLast: isLastSegment,
    });

    previousDisplaySegment = segment;
  }

  if (crumbs.length === 0) return null;

  return (
    <nav
      aria-label="Breadcrumb"
      className="h-6 text-xs text-hud-muted"
    >
      <ol className="flex h-full flex-nowrap items-center gap-1 overflow-x-auto whitespace-nowrap">
        {crumbs.map((crumb) => (
          <li key={crumb.href} className="flex items-center gap-1">
            {crumb.isLast ? (
              <span className="text-hud-ink">{crumb.label}</span>
            ) : (
              <Link
                href={crumb.href}
                className="transition-colors hover:text-hud-ink"
              >
                {crumb.label}
              </Link>
            )}
            {!crumb.isLast && <ChevronRight className="h-3 w-3 text-hud-line" />}
          </li>
        ))}
      </ol>
    </nav>
  );
}
