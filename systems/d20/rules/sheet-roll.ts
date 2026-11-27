import { API_ERRORS } from '@/lib/constants/api-errors';
import type { Translator } from '@/lib/i18n/translator';
import { ContentError } from '@/lib/utils/api/content-error';
import { calculateAttackBonus } from '@/lib/utils/battle/attack/bonus';
import { rollAttackDamage } from '@/lib/utils/battle/damage/roll-attack';
import type { Ruleset } from '@/lib/utils/rules';
import { rollCheck } from '@/systems/d20/rules/checks/roll-check';
import { rollD20WithMode } from '@/systems/d20/rules/dice/roll-d20';
import { rollSave } from '@/systems/d20/rules/saves/roll-save';
import type { BattleParticipant } from '@/types/battle';
import type {
    SheetD20RollResult,
    SheetDamageRollResult,
    SheetRollSubject,
} from '@/types/characters';

function sheetRollLabel(subject: SheetRollSubject, t: Translator): string {
    if (subject.kind === 'attack' || subject.kind === 'damage')
        return subject.attackId;

    if ('skill' in subject) return t(`gameTerms.dndSkills.${subject.skill}`);

    const ability = t(`gameTerms.abilities.${subject.ability}.label`);

    return t(
        subject.kind === 'save'
            ? 'rest.rollLabel.save'
            : 'rest.rollLabel.check',
        { ability }
    );
}

export function rollFromSheet(
    p: BattleParticipant,
    subject: SheetRollSubject,
    opts: {
        rules: Ruleset;
        rng: () => number;
        inspiration: boolean;
        t: Translator;
    }
): SheetD20RollResult | SheetDamageRollResult {
    const base = {
        kind: 'check' as const,
        label: sheetRollLabel(subject, opts.t),
        inspirationUsed: opts.inspiration,
    };

    const shared = {
        participants: [p],
        rules: opts.rules,
        rng: opts.rng,
        advantage: opts.inspiration,
    };

    if (subject.kind === 'damage') {
        const attack = p.battleData.attacks.find(
            (a) => (a.id ?? a.name) === subject.attackId
        );

        if (!attack) throw new ContentError(API_ERRORS.NOT_FOUND, 404);

        const crit = !!subject.crit;

        const r = rollAttackDamage(p, attack, opts.rules, {
            rng: opts.rng,
            crit,
        });

        return {
            kind: 'damage',
            label: opts.t('characterProfile.damageRoll.title', {
                name: attack.name,
            }),
            dice: r.dice,
            flat: r.flat,
            total: r.total,
            crit: r.doubled,
        };
    }

    if (subject.kind === 'attack') {
        const attack = p.battleData.attacks.find(
            (a) => (a.id ?? a.name) === subject.attackId
        );

        if (!attack) throw new ContentError(API_ERRORS.NOT_FOUND, 404);

        const mode = opts.inspiration ? 'advantage' : 'normal';

        const { roll, rolls } = rollD20WithMode(mode, opts.rng);

        const mod = calculateAttackBonus(p, attack, opts.rules);

        return {
            ...base,
            label: attack.name,
            rolls,
            roll,
            mod,
            bonus: 0,
            total: roll + mod,
            mode,
            autoFail: false,
        };
    }

    if (subject.kind === 'save') {
        const r = rollSave({
            target: p,
            ability: subject.ability,
            dc: 0,
            ...shared,
        });

        return {
            ...base,
            rolls: r.rolls,
            roll: r.roll,
            mod: r.mod,
            bonus: r.bonus,
            total: r.total,
            mode: r.mode,
            autoFail: r.autoFail,
        };
    }

    const r = rollCheck({
        actor: p,
        subject:
            'skill' in subject
                ? { skill: subject.skill }
                : { ability: subject.ability },
        ...shared,
    });

    return {
        ...base,
        rolls: r.rolls,
        roll: r.roll,
        mod: r.mod,
        bonus: r.bonus,
        total: r.total,
        mode: r.mode,
        autoFail: false,
    };
}
