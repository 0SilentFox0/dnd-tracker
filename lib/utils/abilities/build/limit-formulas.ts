import { resolveFlat } from '@/lib/utils/abilities/engine/core/amount';
import type { BattleParticipant } from '@/types/battle';

const isFormula = (v: unknown): v is { formula: string } =>
    !!v &&
    typeof v === 'object' &&
    typeof (v as { formula?: unknown }).formula === 'string';

export function resolveLimitFormulas(p: BattleParticipant): BattleParticipant {
    const list = p.battleData.resolvedAbilities;

    const hasFormula = (a: (typeof list)[number]) =>
        isFormula(a.limits?.perRest?.uses) ||
        isFormula(a.limits?.perRest?.shortRegain);

    if (!list.some(hasFormula)) return p;

    return {
        ...p,
        battleData: {
            ...p.battleData,
            resolvedAbilities: list.map((a) => {
                const perRest = a.limits?.perRest;

                if (!a.limits || !perRest || !hasFormula(a)) return a;

                const { shortRegain, ...rest } = perRest;

                const regain = isFormula(shortRegain)
                    ? Math.max(0, resolveFlat(shortRegain, p))
                    : shortRegain;

                return {
                    ...a,
                    limits: {
                        ...a.limits,
                        perRest: {
                            ...rest,
                            uses: isFormula(perRest.uses)
                                ? Math.max(1, resolveFlat(perRest.uses, p))
                                : perRest.uses,
                            ...(regain ? { shortRegain: regain } : {}),
                        },
                    },
                };
            }),
        },
    };
}
