import { Fragment } from "react";
import { useTranslations } from "next-intl";
import { ChevronRight } from "lucide-react";

import { mapPath } from "@/lib/utils/world/tree";
import type { WorldMapSummary } from "@/types/world";

interface WorldCrumbsProps {
  maps: WorldMapSummary[];
  mapId: string;
  onOpen(mapId: string): void;
}

export function WorldCrumbs({ maps, mapId, onOpen }: WorldCrumbsProps) {
  const t = useTranslations("world");

  const path = mapPath(maps, mapId);

  return (
    <nav aria-label={t("crumbs")} className="hud-scroll-x flex flex-nowrap items-center gap-1 overflow-x-auto whitespace-nowrap">
      {path.map((m, i) => (
        <Fragment key={m.id}>
          {i > 0 ? <ChevronRight aria-hidden className="size-3 shrink-0 text-hud-line" /> : null}
          {i === path.length - 1 ? (
            <span aria-current="page" className="hud-sc text-hud-ink">
              {m.name}
            </span>
          ) : (
            <button type="button" className="hud-sc min-h-6 text-hud-gold underline-offset-2 hover:text-hud-gold-bright hover:underline" onClick={() => onOpen(m.id)}>
              {m.name}
            </button>
          )}
        </Fragment>
      ))}
    </nav>
  );
}
