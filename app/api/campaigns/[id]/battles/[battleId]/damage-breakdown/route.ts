import { z } from "zod";

import { computeDamageBreakdown, computeDamageBreakdownMultiTarget } from "@/lib/utils/battle/damage";
import type { BattleMutationContext } from "@/lib/utils/battle/pipeline/run-battle-mutation";
import { runBattleMutation } from "@/lib/utils/battle/pipeline/run-battle-mutation";
import { BattleAccessError, BattleRuleError } from "@/lib/utils/battle/store";
import type { BattleAttack, BattleParticipant } from "@/types/battle";

const schema = z.object({
  attackerId: z.string(),
  targetId: z.string().optional(),
  targetIds: z.array(z.string()).optional(),
  attackId: z.string().optional(),
  damageRolls: z.array(z.number()),
  isCritical: z.boolean().optional(),
});

type Body = z.infer<typeof schema>;

function breakdown(ctx: BattleMutationContext, data: Body) {
  const order = ctx.participants;

  const attacker = order.find((p) => p.basicInfo.id === data.attackerId);

  if (!attacker) throw new BattleAccessError(404, "Атакувальника не знайдено");

  const targetIds = data.targetIds?.length ? data.targetIds : data.targetId ? [data.targetId] : [];

  if (targetIds.length === 0) throw new BattleRuleError("invalid_target", "Потрібна хоча б одна ціль");

  const targets = targetIds
    .map((id) => order.find((p) => p.basicInfo.id === id))
    .filter((p): p is BattleParticipant => Boolean(p));

  if (targets.length !== targetIds.length) throw new BattleAccessError(404, "Ціль не знайдено");

  const attack: BattleAttack | undefined = data.attackId
    ? attacker.battleData.attacks?.find((a) => a.id === data.attackId || a.name === data.attackId)
    : attacker.battleData.attacks?.[0];

  if (!attack) throw new BattleAccessError(404, "Атаку не знайдено");

  const common = { attacker, attack, damageRolls: data.damageRolls, allParticipants: order, isCritical: data.isCritical };

  return targets.length > 1
    ? computeDamageBreakdownMultiTarget({ ...common, targets })
    : computeDamageBreakdown({ ...common, target: targets[0] });
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string; battleId: string }> },
) {
  return runBattleMutation(req, {
    params: await params,
    access: "member",
    schema,
    dryRun: () => true,
    respond: "response",
    mutate: (ctx, body) => ({
      participants: ctx.participants,
      pending: ctx.pending,
      events: [],
      response: breakdown(ctx, body) as unknown as Record<string, unknown>,
    }),
  });
}
