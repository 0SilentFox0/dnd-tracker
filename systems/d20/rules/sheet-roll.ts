import type { Translator } from '@/lib/i18n/translator';
import type { Ruleset } from '@/lib/utils/rules';
import { rollCheck } from '@/systems/d20/rules/checks/roll-check';
import { rollSave } from '@/systems/d20/rules/saves/roll-save';
import type { BattleParticipant } from '@/types/battle';
import type { SheetD20RollResult, SheetRollSubject } from '@/types/characters';

function sheetRollLabel(subject: SheetRollSubject, t: Translator): string {
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
): SheetD20RollResult {
    const base = {
        kind: 'd20' as const,
        label: sheetRollLabel(subject, opts.t),
        inspirationUsed: opts.inspiration,
    };

    const shared = {
        participants: [p],
        rules: opts.rules,
        rng: opts.rng,
        advantage: opts.inspiration,
    };

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
