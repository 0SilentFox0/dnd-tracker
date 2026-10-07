"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight } from "lucide-react";

const SEGMENT_LABELS: Record<string, string> = {
  campaigns: "Кампанії",
  dm: "DM",
  characters: "Персонажі",
  units: "Юніти",
  spells: "Заклинання",
  artifacts: "Артефакти",
  "artifact-sets": "Сети артефактів",
  battles: "Бої",
  character: "Персонаж",
  inventory: "Інвентар",
  new: "Створити",
  edit: "Редагувати",
  sets: "Сети",
  groups: "Групи",
  skills: "Скіли",
  races: "Раси",
  "main-skills": "Основні навики",
  "skill-trees": "Дерева прокачки",
  info: "Довідник",
  print: "Друк",
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
    pathname === "/"
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
      className="h-6 text-xs text-[#8f8473]"
    >
      <ol className="flex h-full flex-nowrap items-center gap-1 overflow-x-auto whitespace-nowrap">
        {crumbs.map((crumb) => (
          <li key={crumb.href} className="flex items-center gap-1">
            {crumb.isLast ? (
              <span className="text-[#efe5d2]">{crumb.label}</span>
            ) : (
              <Link
                href={crumb.href}
                className="transition-colors hover:text-[#efe5d2]"
              >
                {crumb.label}
              </Link>
            )}
            {!crumb.isLast && <ChevronRight className="h-3 w-3 text-[#4a3c2c]" />}
          </li>
        ))}
      </ol>
    </nav>
  );
}
