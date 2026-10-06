"use client";

import { useState } from "react";

import { BranchRow } from "./BranchRow";
import { NewBranchRow } from "./NewBranchRow";
import { NodeSheet, type SheetTarget } from "./NodeSheet";
import { OfferList } from "./OfferList";
import { PointsHeader } from "./PointsHeader";
import { RacialRow } from "./RacialRow";
import { UltimateRow } from "./UltimateRow";

import "@/components/hud/hud.css";
import "./progression.css";
import { EmptyState, QueryState } from "@/components/common/states";
import { HUD_SURFACE } from "@/components/hud";
import { Button } from "@/components/ui/button";
import { useConfirm } from "@/lib/hooks/common";
import { useCharacterProgression, useProgressionActions } from "@/lib/hooks/skills";
import type { NodeState, ProgressionNode } from "@/lib/utils/skills/progression";
import { canUnlearn, CIRCLE_LABEL } from "@/lib/utils/skills/progression";

export function ProgressionPanel({ campaignId, characterId, canManage = false }: { campaignId: string; characterId: string; canManage?: boolean }) {
  const progression = useCharacterProgression(campaignId, characterId);

  const actions = useProgressionActions(campaignId, characterId);

  const confirm = useConfirm();

  const [target, setTarget] = useState<SheetTarget | null>(null);

  const [filter, setFilter] = useState<{ label: string; match: (n: ProgressionNode) => boolean } | null>(null);

  const { data, tree, view, offers } = progression;

  const select = (state: NodeState) => {
    const node = state.nodeId ? tree?.nodes.get(state.nodeId) : undefined;

    if (!node) return;

    if (state.state === "available" && node.kind === "slot") {
      const branch = data?.branches[node.branchId]?.name ?? "";

      setFilter({ label: `${branch} · ${CIRCLE_LABEL[node.circle]}`, match: (n) => n.nodeId === node.nodeId });
      document.getElementById("progression-offers")?.scrollIntoView({ behavior: "smooth" });

      return;
    }

    setTarget({ node, state: state.state, reason: state.reason });
  };

  const learn = async (nodeId: string) => {
    if (await actions.learn(nodeId)) {
      setTarget(null);
      setFilter(null);
    }
  };

  const unlearn = async (nodeId: string) => {
    if (await actions.unlearn(nodeId)) setTarget(null);
  };

  const reset = async () => {
    if (await confirm({ title: "Скинути дерево прокачки?", description: "Усі вивчені вміння персонажа буде знято.", confirmLabel: "Скинути", destructive: true })) await actions.reset();
  };

  return (
    <div id="progression" className={`${HUD_SURFACE} skill-progression overflow-hidden rounded-xl`}>
      <QueryState query={progression.query}>
        {(dto) =>
          !tree || !view ? (
            <EmptyState title={`Майстер ще не налаштував дерево для раси ${dto.race}`} />
          ) : (
            <>
              <PointsHeader level={dto.level} spent={view.points.spent} free={view.points.free} />
              <RacialRow states={view.racial} tree={tree} dto={dto} onSelect={select} />
              {view.branches.length > 0 && <h3 className="hud-sc mx-4 mb-1.5 mt-3.5 text-[13px] uppercase tracking-[.12em] text-[#8f8473]">Гілки</h3>}
              {view.branches.map((row) => <BranchRow key={row.branchId} row={row} dto={dto} onSelect={select} />)}
              {view.points.free > 0 && view.untouchedBranchCount > 0 && (
                <NewBranchRow count={view.untouchedBranchCount} onSelect={() => setFilter({ label: "Нові гілки", match: (n) => n.kind === "branchLevel" && n.level === "basic" })} />
              )}
              {view.ultimate && (view.ultimate.state !== "locked" || canManage) && <UltimateRow state={view.ultimate} dto={dto} onSelect={select} />}
              {view.points.free > 0 && <OfferList offers={offers} dto={dto} filter={filter} onClearFilter={() => setFilter(null)} onSelect={(node) => setTarget({ node, state: "available" })} />}
              {canManage && (
                <div className="flex flex-wrap gap-2 px-4 py-3">
                  {view.orphans.length > 0 && (
                    <Button type="button" variant="link" size="sm" className="h-auto p-0 text-xs text-[#d6cbb7]" onClick={async () => { for (const id of view.orphans) await actions.unlearn(id); }}>
                      Застарілі вузли: {view.orphans.length} · Прибрати
                    </Button>
                  )}
                  <Button type="button" variant="link" size="sm" className="h-auto p-0 text-xs text-[#d0705c]" onClick={reset}>Скинути дерево</Button>
                </div>
              )}
              <NodeSheet
                target={target}
                dto={dto}
                actions={{
                  onClose: () => setTarget(null),
                  onLearn: learn,
                  onUnlearn: canManage && target && canUnlearn(tree, dto.unlocked, target.node.nodeId).ok ? unlearn : undefined,
                  pending: actions.pendingNodeId !== null,
                }}
              />
            </>
          )
        }
      </QueryState>
    </div>
  );
}
