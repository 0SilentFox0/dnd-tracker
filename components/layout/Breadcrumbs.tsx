"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { ChevronRight } from "lucide-react";

import { DM_SECTIONS } from "@/lib/constants/campaigns";
import { LANDING_PATHS } from "@/lib/constants/site";
import type { Translator } from "@/lib/i18n/translator";
import { useTranslator } from "@/lib/i18n/use-translator";

const SEGMENT_KEYS = ["campaigns", "dm", "character", "inventory", "new", "edit", "sets", "groups", "main-skills", "info", "print", "world", "show", "scenario"] as const;

const ID_KEYS = ["campaigns", "battles", "characters", "units", "spells", "artifacts", "sets"] as const;

const isIn = <T extends string>(keys: readonly T[], value: string | undefined): value is T => !!value && (keys as readonly string[]).includes(value);

type Translate = ReturnType<typeof useTranslations<"common.breadcrumbs">>;

const DM_SECTION_PATHS = DM_SECTIONS.map((s) => s.path);

function getLabel(t: Translate, tCommon: Translator, segment: string, previous?: string) {
  if (isIn(SEGMENT_KEYS, segment)) return t(`segments.${segment}`);

  if (isIn(DM_SECTION_PATHS, segment)) return tCommon(`dmSections.${segment}`);

  if (isIn(ID_KEYS, previous)) return t(`ids.${previous}`);

  return t("details");
}

export function Breadcrumbs() {
  const t = useTranslations("common.breadcrumbs");

  const tCommon = useTranslator("common");

  const pathname = usePathname();

  if (
    pathname?.startsWith("/sign-in") ||
    pathname?.startsWith("/sign-up") ||
    LANDING_PATHS.includes(pathname)
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
      label: getLabel(t, tCommon, segment, previousDisplaySegment),
      isLast: isLastSegment,
    });

    previousDisplaySegment = segment;
  }

  if (crumbs.length === 0) return null;

  return (
    <nav
      aria-label={t("label")}
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
