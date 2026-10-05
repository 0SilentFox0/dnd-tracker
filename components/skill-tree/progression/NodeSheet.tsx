import { nodeLabel } from "./node-labels";

import { HUD_SURFACE } from "@/components/hud";
import { Button } from "@/components/ui/button";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import type { NodeState, ProgressionNode } from "@/lib/utils/skills/progression";
import { LEARN_BLOCK_TEXT } from "@/lib/utils/skills/progression";
import type { CharacterProgressionDto } from "@/types/progression";

export interface SheetTarget { node: ProgressionNode; state: NodeState["state"]; reason?: NodeState["reason"] }

export function NodeSheet({ target, dto, actions }: {
  target: SheetTarget | null;
  dto: CharacterProgressionDto;
  actions: { onClose: () => void; onLearn?: (nodeId: string) => void; onUnlearn?: (nodeId: string) => void; pending: boolean };
}) {
  if (!target) return null;

  const { node, state, reason } = target;

  const { title, tag, skillName } = nodeLabel(node, dto);

  const skill = node.skillId ? dto.skills[node.skillId] : undefined;

  const { onLearn, onUnlearn } = actions;

  const footer =
    state === "available" && onLearn ? (
      <Button onClick={() => onLearn(node.nodeId)} disabled={actions.pending}>Вивчити</Button>
    ) : state === "learned" && onUnlearn ? (
      <Button variant="outline" onClick={() => onUnlearn(node.nodeId)} disabled={actions.pending}>Розвчити</Button>
    ) : undefined;

  return (
    <ResponsiveDialog open onOpenChange={(open) => !open && actions.onClose()} title={title} description={tag} footer={footer} className={HUD_SURFACE}>
      {skill ? (
        <div className="space-y-2 text-sm">
          {skill.summary.length > 0 && <p className="text-[#c9b37a]">{skill.summary.join(" · ")}</p>}
          {skill.description && <p className="whitespace-pre-line">{skill.description}</p>}
        </div>
      ) : (
        !skillName && (node.kind === "branchLevel" || node.kind === "racial") && <p className="text-sm italic">Майстер ще не призначив скіл цьому рівню</p>
      )}
      {state === "locked" && reason && <p className="mt-3 text-sm text-[#d0705c]">{LEARN_BLOCK_TEXT[reason]}</p>}
    </ResponsiveDialog>
  );
}
