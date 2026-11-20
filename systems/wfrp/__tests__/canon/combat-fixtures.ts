import { AttackType } from '@/lib/constants/battle';
import { makeParticipant } from '@/lib/utils/abilities/__tests__/fixtures';
import { RulesetSchema } from '@/lib/utils/rules/schema';
import { attackOf, slotOf } from '@/systems/wfrp/rules/__tests__/slot-fixtures';
import { DEFAULT_CHARACTERISTICS } from '@/systems/wfrp/rules/characteristics/keys';
import { resolveWfrpAttack } from '@/systems/wfrp/rules/combat/resolve-attack';
import { FORTUNE_INPUT } from '@/systems/wfrp/rules/percentile/fortune';
import { WFRP_RULES } from '@/systems/wfrp/rules/rules-preset';
import { ATTACK_SLOT } from '@/systems/wfrp/rules/slots';
import type { TraitSize } from '@/systems/wfrp/rules/trait-kinds';
import type { BattleAttack, BattleParticipant } from '@/types/battle';
import type { BattleMapConfig } from '@/types/battle-grid';

export const canonRules = RulesetSchema.parse({
    ...WFRP_RULES,
    edition: { preset: 'canon5e' },
});

export const legacyRules = RulesetSchema.parse({
    ...WFRP_RULES,
    edition: { preset: 'legacy' },
});

export const fighter = (
    id: string,
    over: {
        side?: 'ally' | 'enemy';
        at?: { x: number; y: number };
        size?: TraitSize;
        ws?: number;
        sb?: number;
        tb?: number;
    } = {}
): BattleParticipant => {
    const base = makeParticipant({ id, hp: 20, maxHp: 20 });

    return {
        ...base,
        basicInfo: { ...base.basicInfo, side: over.side ?? 'ally' },
        battleData: {
            ...base.battleData,
            ...(over.at && { position: over.at }),
        },
        abilities: {
            ...base.abilities,
            system: slotOf(
                {
                    ...DEFAULT_CHARACTERISTICS,
                    base: {
                        ...DEFAULT_CHARACTERISTICS.base,
                        ws: over.ws ?? 40,
                    },
                },
                {
                    sb: over.sb ?? 0,
                    tb: over.tb ?? 0,
                    ...(over.size && { size: over.size }),
                }
            ),
        },
    };
};

export const sword = (
    over: {
        reach?: 'average' | 'long' | 'short';
        sizeBaked?: true;
        hand?: 'off';
    } = {}
): BattleAttack =>
    ({
        id: 'sw',
        name: 'Sword',
        type: AttackType.MELEE,
        attackBonus: 0,
        damageDice: '',
        damageType: 'physical',
        system: ATTACK_SLOT.write({
            qualities: [],
            flaws: [],
            ...over,
        }),
    }) as unknown as BattleAttack;

export const bow = (): BattleAttack =>
    ({
        id: 'bw',
        name: 'Bow',
        type: AttackType.RANGED,
        attackBonus: 0,
        damageDice: '',
        damageType: 'physical',
        range: '60 ft',
        system: ATTACK_SLOT.write({ qualities: [], flaws: [] }),
    }) as unknown as BattleAttack;

export const input = (data: Record<string, unknown>) =>
    FORTUNE_INPUT.write({ kind: 'none', ...data } as never);

/** Attack with fixed dice so two scenarios differ only by their modifiers */
export function attackDetails(
    attacker: BattleParticipant,
    target: BattleParticipant,
    attack: BattleAttack,
    opts: {
        participants?: BattleParticipant[];
        rules?: typeof canonRules;
        map?: BattleMapConfig | null;
        system?: ReturnType<typeof input>;
        manualRoll?: number;
        obstacle?: boolean;
    } = {}
) {
    const r = resolveWfrpAttack({
        attacker,
        target,
        attack,
        participants: opts.participants ?? [attacker, target],
        rules: opts.rules ?? canonRules,
        rng: () => 0.5,
        manualRoll: opts.manualRoll ?? 5,
        map: opts.map,
        system: opts.system,
        obstacle: opts.obstacle,
    });

    return { result: r, details: attackOf(r.attackRoll) };
}
