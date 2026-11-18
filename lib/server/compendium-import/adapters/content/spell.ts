import { renderEntries } from '../../entries';
import { type Adapter, issue } from '../../types';
import { customConditionKeys } from '../custom-conditions';
import { array, description, object, str, unsupported } from '../shared';
import { spellCast } from '../spell-cast';
import { deriveSpell } from '../spell-derive';

import { schoolByCode } from '@/lib/constants/spell-groups';
import { castingFields, spellHead } from '@/lib/utils/spells/derive/mechanics';

const SPELL_CONSUMED = [
    'level',
    'school',
    'classes',
    'time',
    'range',
    'components',
    'duration',
    'meta',
    'damageInflict',
    'savingThrow',
    'spellAttack',
    'scalingLevelDice',
    'conditionInflict',
    'damageImmune',
    'damageResist',
    'damageVulnerable',
    'conditionImmune',
    'abilityCheck',
    'areaTags',
    'miscTags',
];

const MANUAL_SPELL_BODY = {
    executionMode: 'manual',
    targeting: { kind: 'self' },
    resolution: { kind: 'auto' },
    dice: 0,
    spellEffects: [],
};

export const spell: Adapter = (row, ctx) => {
    const cast = spellCast(row);

    const lists = array(object(row.classes).fromClassList)
        .map((r) => str(object(r).name))
        .filter(Boolean);

    const school = schoolByCode(str(row.school))?.name ?? str(row.school);

    const head = spellHead({
        level: row.level as number,
        school,
        casting: cast.castingText,
        ritual: cast.ritual,
        range: cast.rangeText,
        components: cast.components,
        duration: cast.durationText,
        concentration: cast.concentration,
        classes: lists,
    });

    const text = renderEntries(row.entries, `${ctx.path}.entries`);

    const derived = deriveSpell(
        row,
        text.text,
        renderEntries(row.entriesHigherLevel).text,
        cast,
        ctx.t,
        customConditionKeys(ctx.root)
    );

    const mechanics =
        'native' in derived
            ? { executionMode: 'native', ...derived.native.fields }
            : MANUAL_SPELL_BODY;

    if ('blocker' in derived)
        ctx.issues.push(
            issue(
                `MANUAL_SPELL_${derived.blocker}`,
                ctx.path,
                'warning',
                derived.detail
            )
        );
    else if (derived.native.narrative)
        ctx.issues.push(issue('SPELL_NARRATIVE_ONLY', ctx.path, 'warning'));
    else if (derived.native.riders.length > 0)
        ctx.issues.push(
            issue('SPELL_RIDER_MANUAL', ctx.path, 'warning', {
                riders: derived.native.riders.join(', '),
            })
        );

    return {
        kind: 'spells',
        refs:
            'native' in derived
                ? (derived.native.refs ?? []).map((r) => ({
                      ...r,
                      edition: ctx.edition,
                  }))
                : [],
        body: {
            name: row.name,
            level: row.level,
            description: [head, description(row, ctx)]
                .filter(Boolean)
                .join('\n\n'),
            ...mechanics,
            ...castingFields(cast.castingKey, cast.trigger),
            concentration: cast.concentration,
            ritual: cast.ritual,
            componentFlags: cast.componentFlags,
            ingredients: cast.ingredients,
            lists,
        },
        notes: unsupported(row, SPELL_CONSUMED, ctx),
    };
};
