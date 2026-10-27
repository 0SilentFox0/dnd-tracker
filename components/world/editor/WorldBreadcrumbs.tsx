import { Fragment } from "react";

import { useWorldEditorContext } from "./WorldEditorContext";

import { mapPath } from "@/lib/utils/world/tree";

export function WorldBreadcrumbs({ mapId }: { mapId: string }) {
  const { maps, openMap } = useWorldEditorContext();

  const path = mapPath(maps, mapId);

  return (
    <nav aria-label="Шлях по картах" className="flex flex-wrap items-center gap-1">
      {path.map((m, i) => (
        <Fragment key={m.id}>
          {i > 0 ? <span aria-hidden>›</span> : null}
          {i === path.length - 1 ? (
            <span aria-current="page">{m.name}</span>
          ) : (
            <button type="button" className="underline-offset-2 hover:underline" onClick={() => openMap(m.id)}>
              {m.name}
            </button>
          )}
        </Fragment>
      ))}
    </nav>
  );
}
