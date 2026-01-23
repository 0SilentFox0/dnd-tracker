"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight } from "lucide-react";

const SEGMENT_LABELS: Record<string, string> = {
  campaigns: "Кампанії",
  dm: "DM",
  characters: "Персонажі",
  "npc-heroes": "NPC Герої",
  units: "Юніти",
  spells: "Заклинання",
  artifacts: "Артефакти",
  battles: "Бої",
  character: "Персонаж",
  inventory: "Інвентар",
  new: "Створити",
  edit: "Редагувати",
  sets: "Сети",
  groups: "Групи",
};

const ID_LABELS_BY_PARENT: Record<string, string> = {
  campaigns: "Кампанія",
  battles: "Бій",
  characters: "Персонаж",
  units: "Юніт",
  spells: "Заклинання",
  artifacts: "Артефакт",
  "npc-heroes": "NPC Герой",
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

  // Build crumbs, skipping 'dm' and 'battles' segments but keeping them in hrefs
  const crumbs: Array<{ href: string; label: string; isLast: boolean }> = [];

  let previousDisplaySegment: string | undefined;

  for (let i = 0; i < allSegments.length; i++) {
    const segment = allSegments[i];

    // Skip 'dm' segments - don't create breadcrumb for them
    if (segment === "dm") {
      continue;
    }

    // Skip 'battles' segments - don't create breadcrumb for them
    if (segment === "battles") {
      continue;
    }

    // Build href using all segments up to this point (including any 'dm' or 'battles' segments)
    const href = `/${allSegments.slice(0, i + 1).join("/")}`;

    const label = getLabel(segment, previousDisplaySegment);

    crumbs.push({
      href,
      label,
      isLast: i === allSegments.length - 1,
    });

    previousDisplaySegment = segment;
  }

  if (crumbs.length === 0) return null;

  return (
    <nav
      aria-label="Breadcrumb"
      className="text-xs sm:text-sm text-muted-foreground"
    >
      <ol className="flex flex-wrap items-center gap-1">
        {crumbs.map((crumb) => (
          <li key={crumb.href} className="flex items-center gap-1">
            {crumb.isLast ? (
              <span className="text-foreground">{crumb.label}</span>
            ) : (
              <Link
                href={crumb.href}
                className="hover:text-foreground transition-colors"
              >
                {crumb.label}
              </Link>
            )}
            {!crumb.isLast && <ChevronRight className="h-3 w-3" />}
          </li>
        ))}
      </ol>
    </nav>
  );
}
