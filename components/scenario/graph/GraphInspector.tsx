"use client";

import { useTranslations } from "next-intl";
import { Lock } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { GraphDetail } from "@/lib/utils/scenario/graph/types";

export interface GraphInspectorProps {
  detail: GraphDetail;
  canOpen: boolean;
  onOpen: () => void;
  onSelect: (id: string) => void;
  onClose: () => void;
}

export function GraphInspector({ detail, canOpen, onOpen, onSelect, onClose }: GraphInspectorProps) {
  const t = useTranslations("scenarioGraph.inspector");

  const tPage = useTranslations("scenario.pageKinds");

  const tType = useTranslations("scenario.mentionTypes");

  const { node, links } = detail;

  const kind = node.kind === "scene" ? tPage(node.pageKind ?? "scene") : node.type ? tType(node.type) : "";

  return (
    <div className="flex flex-col gap-3">
      <div>
        <p className="text-xs uppercase text-muted-foreground">{kind}</p>
        <p className="font-medium">{node.label}</p>
        {node.missing ? <p className="text-sm text-destructive">{t("missingHint")}</p> : null}
      </div>
      <div className="flex gap-2">
        <Button size="sm" disabled={!canOpen} onClick={onOpen}>{t("open")}</Button>
        <Button size="sm" variant="outline" onClick={onClose}>{t("close")}</Button>
      </div>
      <div>
        <p className="mb-1 text-sm font-medium">{t("connections")}</p>
        {links.length === 0 ? <p className="text-sm text-muted-foreground">{t("noConnections")}</p> : null}
        <ul className="flex flex-col gap-1">
          {links.map((l) => (
            <li key={l.node.id}>
              <button type="button" className="flex w-full items-center gap-2 rounded px-1 py-0.5 text-left text-sm hover:bg-accent" onClick={() => onSelect(l.node.id)}>
                <span className="flex-1 truncate">{l.node.label}</span>
                {l.secret ? <Lock className="size-3.5" aria-hidden /> : null}
                <span className="text-xs text-muted-foreground">×{l.count}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
