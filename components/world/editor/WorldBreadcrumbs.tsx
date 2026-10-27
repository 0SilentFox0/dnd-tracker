import { Fragment } from "react";
import { ChevronRight } from "lucide-react";

import { useWorldEditorContext } from "./WorldEditorContext";

import { mapPath } from "@/lib/utils/world/tree";

export function WorldBreadcrumbs({ mapId }: { mapId: string }) {
  const { maps, openMap } = useWorldEditorContext();

  const path = mapPath(maps, mapId);

  return (
    <nav aria-label="Шлях по картах" className="hud-scroll-x flex flex-nowrap items-center gap-1 overflow-x-auto whitespace-nowrap">
      {path.map((m, i) => (
        <Fragment key={m.id}>
          {i > 0 ? <ChevronRight aria-hidden className="size-3 shrink-0 text-hud-line" /> : null}
          {i === path.length - 1 ? (
            <span aria-current="page" className="hud-sc text-hud-ink">
              {m.name}
            </span>
          ) : (
            <button type="button" className="hud-sc min-h-6 text-hud-gold underline-offset-2 hover:text-hud-gold-bright hover:underline" onClick={() => openMap(m.id)}>
              {m.name}
            </button>
          )}
        </Fragment>
      ))}
    </nav>
  );
}
