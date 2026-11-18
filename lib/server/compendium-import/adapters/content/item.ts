import { stableJson } from '../../identity';
import { type Adapter, issue } from '../../types';
import { EFFECT_FIELDS, itemEffects } from '../item-effects';
import { array, description, num, object, str, unsupported } from '../shared';

const DAMAGE: Record<string, string> = {
    P: 'piercing',
    S: 'slashing',
    B: 'bludgeoning',
    A: 'acid',
    C: 'cold',
    F: 'fire',
    L: 'lightning',
    N: 'necrotic',
    O: 'force',
    R: 'radiant',
    T: 'thunder',
    Y: 'psychic',
    I: 'poison',
};

const CONSUMABLE_TYPES = new Set(['P', 'SC', 'A', 'AF', 'EXP', 'FD']);

const CONSUMABLE_TYPE_NAME =
    /^(?:ingredient|potion|scroll|ammunition|food|drink)/i;

const UNIQUE_RARITIES = new Set(['artifact', 'unknown', 'unknown (magic)']);

const OTHER_EFFECT_FIELDS =
    /^(?:bonus|modifySpeed$|attachedSpells$|charges$|recharge|grantsProficiency$|conditionImmune$|immune$|vulnerable$|ability$|crit)/;

export const item: Adapter = (row, ctx) => {
    const type = str(row.type).split('|')[0];

    const slots: Record<string, string> = {
        M: 'weapon',
        R: 'range_weapon',
        S: 'shield',
        LA: 'armor',
        MA: 'armor',
        HA: 'armor',
        RG: 'ring',
    };

    const slot = slots[type] ?? 'item';

    const rarity = str(row.rarity);

    const rarities: Record<string, string> = {
        common: 'common',
        uncommon: 'uncommon',
        rare: 'rare',
        'very rare': 'epic',
        legendary: 'legendary',
    };

    const customType = array(ctx.root.itemType)
        .map(object)
        .find((t) => t.abbreviation === type);

    const consumable =
        array(row.miscTags).includes('CNS') ||
        CONSUMABLE_TYPES.has(type) ||
        CONSUMABLE_TYPE_NAME.test(str(customType?.name));

    const text = description(row, ctx);

    const hasWeapon = ['M', 'R'].includes(type) && typeof row.dmg1 === 'string';

    const effects = itemEffects(
        row,
        { consumable, potion: type === 'P', hasWeapon, text },
        ctx.t
    );

    const unique =
        !consumable &&
        ctx.inputKind !== 'baseitem' &&
        UNIQUE_RARITIES.has(rarity);

    const body: Record<string, unknown> = {
        name: row.name,
        description: text,
        slot,
        item: {
            unique,
            ...(consumable && { consumable: true }),
            ...(row.reqAttune !== undefined &&
                !consumable && { attunement: row.reqAttune !== false }),
        },
    };

    if (rarities[rarity]) body.rarity = rarities[rarity];

    if (hasWeapon)
        body.weapon = {
            damageDice: row.dmg1,
            damageType: DAMAGE[str(row.dmgType)] ?? str(row.dmgType),
            attackType: type === 'M' ? 'melee' : 'ranged',
            ...(typeof row.dmg2 === 'string' && { versatileDice: row.dmg2 }),
            ...effects.weapon,
        };

    if (['LA', 'MA', 'HA'].includes(type) && num(row.ac) !== undefined)
        body.armor = {
            category: { LA: 'light', MA: 'medium', HA: 'heavy' }[type],
            base: row.ac,
            ...(type === 'MA' && { dexCap: 2 }),
            ...(type === 'HA' && { dexCap: 0 }),
        };

    if (effects.abilities.length > 0) body.abilities = effects.abilities;

    const manual = [
        ...new Set([
            ...effects.manual,
            ...Object.keys(row).filter(
                (f) =>
                    OTHER_EFFECT_FIELDS.test(f) &&
                    !EFFECT_FIELDS.includes(f as never)
            ),
        ]),
    ];

    for (const field of manual)
        ctx.issues.push(
            issue('MANUAL_ITEM_EFFECT', `${ctx.path}.${field}`, 'warning')
        );

    const notes = [
        unsupported(
            row,
            [
                'type',
                'rarity',
                'dmg1',
                'dmg2',
                'dmgType',
                'ac',
                'reqAttune',
                'miscTags',
                'wondrous',
                ...EFFECT_FIELDS,
                ...Object.keys(row).filter((f) => OTHER_EFFECT_FIELDS.test(f)),
            ],
            ctx
        ),
        ...manual.map((f) => `${f}: ${stableJson(row[f])}`),
    ]
        .filter(Boolean)
        .join('\n');

    return { kind: 'artifacts', body, notes };
};
