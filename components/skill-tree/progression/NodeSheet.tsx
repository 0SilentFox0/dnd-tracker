import { useTranslations } from "next-intl";

import { HUD_SURFACE } from "@/components/hud";
import { Button } from "@/components/ui/button";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import { useTranslator } from "@/lib/i18n/use-translator";
import type { NodeState, ProgressionNode } from "@/lib/utils/skills/progression";
import { BRANCH_MIN_LEVEL } from "@/lib/utils/skills/progression";
import { nodeLabel } from "@/lib/utils/skills/progression/labels";
import type { CharacterProgressionDto } from "@/types/progression";

export interface SheetTarget { node: ProgressionNode; state: NodeState["state"]; reason?: NodeState["reason"] }

export function NodeSheet({ target, dto, actions }: {
  target: SheetTarget | null;
  dto: CharacterProgressionDto;
  actions: { onClose: () => void; onLearn?: (nodeId: string) => void; onUnlearn?: (nodeId: string) => void; pending: boolean };
}) {
  const t = useTranslations("skillTree.node");

  const tr = useTranslator("skillTree");

  if (!target) return null;

  const { node, state, reason } = target;

  const { title, tag, skillName } = nodeLabel(node, dto, tr);

  const skill = node.skillId ? dto.skills[node.skillId] : undefined;

  const { onLearn, onUnlearn } = actions;

  const footer =
    state === "available" && onLearn ? (
      <Button onClick={() => onLearn(node.nodeId)} disabled={actions.pending}>{t("learn")}</Button>
    ) : state === "learned" && onUnlearn ? (
      <Button variant="outline" onClick={() => onUnlearn(node.nodeId)} disabled={actions.pending}>{t("unlearn")}</Button>
    ) : undefined;

  return (
    <ResponsiveDialog open onOpenChange={(open) => !open && actions.onClose()} title={title} description={tag} footer={footer} className={HUD_SURFACE}>
      {skill ? (
        <div className="space-y-2 text-sm">
          {skill.summary.length > 0 && <p className="text-hud-gold">{skill.summary.join(" · ")}</p>}
          {skill.description && <p className="whitespace-pre-line">{skill.description}</p>}
        </div>
      ) : (
        !skillName && (node.kind === "branchLevel" || node.kind === "racial") && <p className="text-sm italic">{t("unassigned")}</p>
      )}
      {state === "locked" && reason && <p className="mt-3 text-sm text-hud-danger">{tr(`reasons.${reason}`, { level: BRANCH_MIN_LEVEL.expert })}</p>}
    </ResponsiveDialog>
  );
}
