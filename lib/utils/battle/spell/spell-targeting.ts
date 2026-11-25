import { DEFAULT_AREA_TARGETS } from '@/lib/constants/abilities';
import { API_ERRORS } from '@/lib/constants/api-errors';
import { SKILL_AREA_RADIUS_FEET } from '@/lib/constants/battle';
import { textRef } from '@/lib/i18n/text-ref';
import { collectModifiers } from '@/lib/utils/abilities/engine/core/collect-modifiers';
import {
    findParticipant,
    isActive,
    isAirborne,
    isTargetable,
} from '@/lib/utils/abilities/engine/core/participants';
import type { FlagEffect } from '@/lib/utils/abilities/schema';
import { conditionSourceIds } from '@/lib/utils/battle/conditions/query';
import { isDying } from '@/lib/utils/battle/death-saves';
import { gridOf } from '@/lib/utils/battle/grid/geometry';
import { footprintDistance, inBounds } from '@/lib/utils/battle/grid/geometry';
import { cellsOf, isOnMap } from '@/lib/utils/battle/grid/occupancy';
import {
    sightedTargets,
    wallsAllowAim,
    wallsAllowSight,
} from '@/lib/utils/battle/grid/sight';
import {
    aimInRange,
    feetToCells,
    templateAimAllowed,
    templateArea,
    templateCentre,
} from '@/lib/utils/battle/grid/template';
import {
    isHostile,
    modeAimHiddenText,
    modeTargetHiddenText,
} from '@/lib/utils/battle/modes/engine';
import { isReserved } from '@/lib/utils/battle/participant/reserve';
import { findEffectMarker } from '@/lib/utils/battle/participant/state';
import { TOUCH_FEET } from '@/lib/utils/battle/spell/attack-type';
import { casterPicksSlot } from '@/lib/utils/battle/spell/picks-slot';
import { matchesTargetFilter } from '@/lib/utils/battle/spell/target-filter';
import { REJECT } from '@/lib/utils/battle/store/reject';
import type { Ruleset } from '@/lib/utils/rules/schema';
import { ruleSystemOf } from '@/lib/utils/rules/systems';
import type { CastExtension } from '@/lib/utils/rules/systems/types';
import { cantripTier } from '@/lib/utils/spells/model/dice';
import type { SpellTargeting as SpellTargetingDef } from '@/lib/utils/spells/model/schema';
import type { BattleParticipant } from '@/types/battle';
import type { GridKind } from '@/types/battle-grid';
import type {
    BattleMapConfig,
    GridPoint,
    SpellTemplate,
} from '@/types/battle-grid';
import type { LogLine } from '@/types/text';

export interface SpellRef {
    id: string;
    groupId: string | null;
    level: number;
}

export interface SkillSpellTargeting {
    mode: 'single' | 'area' | 'all';
    maxTargets: number;
}

type TargetingFlag = Extract<FlagEffect, { flag: 'spellTargeting' }>;

const fitsSpell = (f: TargetingFlag, spell: SpellRef) =>
    (f.maxLevel === undefined || spell.level <= f.maxLevel) &&
    (!f.spellIds || f.spellIds.includes(spell.id)) &&
    (!f.school || f.school === spell.groupId);

export function spellWideningOf(
    ps: BattleParticipant[],
    casterId: string,
    spell: SpellRef
): SkillSpellTargeting & { source?: LogLine } {
    const found = collectModifiers(ps, casterId, {
        flag: 'spellTargeting',
    }).entries.flatMap((e) =>
        e.flag?.flag === 'spellTargeting' && fitsSpell(e.flag, spell)
            ? [{ flag: e.flag, source: e.source ?? e.label }]
            : []
    );

    const all = found.find((f) => f.flag.mode === 'all');

    if (all) return { mode: 'all', maxTargets: Infinity, source: all.source };

    const areas = found.map((f) => ({
        maxTargets: f.flag.maxTargets ?? DEFAULT_AREA_TARGETS,
        source: f.source,
    }));

    if (areas.length === 0) return { mode: 'single', maxTargets: 1 };

    const best = areas.reduce((a, b) => (b.maxTargets > a.maxTargets ? b : a));

    return { mode: 'area', ...best };
}

export function spellTargetingFor(
    ps: BattleParticipant[],
    casterId: string,
    spell: SpellRef
): SkillSpellTargeting {
    const { mode, maxTargets } = spellWideningOf(ps, casterId, spell);

    return { mode, maxTargets };
}

export function skillAllTargets(
    ps: BattleParticipant[],
    caster: BattleParticipant,
    side: 'ally' | 'enemy',
    map?: BattleMapConfig | null
): string[] {
    return ps
        .filter(
            (p) =>
                isTargetable(p) &&
                !isReserved(p) &&
                !isHostile(map, caster, p) === (side === 'ally')
        )
        .map((p) => p.basicInfo.id);
}

export interface SkillRadius {
    side: 'ally' | 'enemy';
    maxTargets: number;
}

export interface AimScene {
    map: BattleMapConfig;
    participants: BattleParticipant[];
    caster: BattleParticipant;
    rules: Ruleset;
}

export const SKILL_AREA_TEMPLATE: SpellTemplate = {
    shape: 'circle',
    size: SKILL_AREA_RADIUS_FEET,
};

export function skillRadiusArea(
    { map, participants, caster, rules }: AimScene,
    radius: SkillRadius,
    aim: GridPoint
): { cells: string[]; targets: BattleParticipant[] } {
    const { cells, targets } = templateArea(
        map,
        participants,
        caster,
        SKILL_AREA_TEMPLATE,
        aim,
        rules
    );

    const sided = targets.filter(
        (p) => !isHostile(map, caster, p) === (radius.side === 'ally')
    );

    return { cells, targets: sided.slice(0, radius.maxTargets) };
}

export interface SpellChain {
    side: 'ally' | 'enemy';
    maxTargets: number;
}

export function spellChain(
    { participants, caster }: Omit<AimScene, 'map' | 'rules'>,
    chain: SpellChain,
    first: BattleParticipant,
    map?: BattleMapConfig | null
): BattleParticipant[] {
    const pool = participants.filter(
        (p) =>
            p !== first &&
            isActive(p) &&
            isOnMap(p) &&
            !isHostile(map, caster, p) === (chain.side === 'ally')
    );

    const out = [first];

    const grid = gridOf(map);

    while (
        out.length < chain.maxTargets &&
        pool.length > 0 &&
        isOnMap(out[out.length - 1])
    ) {
        const from = cellsOf(out[out.length - 1], grid);

        const next = pool.reduce((best, p) =>
            footprintDistance(from, cellsOf(p, grid), grid) <
            footprintDistance(from, cellsOf(best, grid), grid)
                ? p
                : best
        );

        out.push(next);
        pool.splice(pool.indexOf(next), 1);
    }

    return out;
}

export function validateSpellTargetCount(
    targeting: SkillSpellTargeting,
    count: number
): boolean {
    return targeting.mode === 'all' || count <= targeting.maxTargets;
}

const projectileCap = (
    caster: BattleParticipant,
    spell: SpellRef,
    base: number
): number => (spell.level === 0 ? cantripTier(caster.abilities.level) : base);

export function spreadProjectiles(
    distinct: string[],
    requested: string[],
    cap: number
): SpellTargetResolution {
    if (distinct.length > cap || requested.length > cap)
        return fail(textRef('battleActions.spell.target.tooMany'));

    const shots = requested.filter((id) => distinct.includes(id));

    for (let i = 0; shots.length < cap; i++)
        shots.push(distinct[i % distinct.length]);

    return { ok: true, targetIds: shots };
}

export type SpellTargetResolution =
    | { ok: true; targetIds: string[]; cells?: string[]; centre?: GridPoint }
    | { ok: false; error: LogLine };

export interface SpellMapContext {
    map: BattleMapConfig | null;
    rules: Ruleset;
    targetCell?: GridPoint;
    castLevel?: number;
    upcastTargets?: number;
    /** Declared overcast extension: wider range, area and target count */
    extension?: CastExtension;
}

const SIGHTED_KINDS: ReadonlySet<SpellTargetingDef['kind']> = new Set([
    'ally',
    'enemy',
    'allyDead',
    'area',
    'template',
]);

const fail = (error: LogLine): SpellTargetResolution => ({ ok: false, error });

type TemplateTargeting = Extract<SpellTargetingDef, { kind: 'template' }>;

interface FilterLevel {
    spellLevel: number;
    castLevel?: number;
}

function resolveTemplate(
    ps: BattleParticipant[],
    caster: BattleParticipant,
    targeting: TemplateTargeting,
    map: BattleMapConfig,
    aim: GridPoint | undefined,
    level: FilterLevel,
    rules: Ruleset
): SpellTargetResolution {
    const passing = (targets: BattleParticipant[]) =>
        targets
            .filter((p) =>
                matchesTargetFilter(p, targeting.filter, level, rules)
            )
            .map((p) => p.basicInfo.id);

    const grid = gridOf(map);

    if (targeting.shape === 'emanation') {
        const centre = cellsOf(caster, grid)[0];

        const { cells, targets } = templateArea(
            map,
            ps,
            caster,
            targeting,
            centre,
            rules
        );

        return { ok: true, targetIds: passing(targets), cells, centre };
    }

    if (!aim) return fail(textRef('battleActions.spell.target.pickPoint'));

    if (!inBounds(map, aim))
        return fail(textRef('battleActions.spell.target.pointOutOfMap'));

    if (
        !templateAimAllowed(
            cellsOf(caster, grid),
            targeting,
            aim,
            targeting.range,
            rules,
            grid
        )
    )
        return fail(textRef('battleActions.spell.target.pointOutOfRange'));

    const hidden = modeAimHiddenText(map, caster, aim);

    if (hidden) return fail(hidden);

    if (!wallsAllowAim(map, caster, aim))
        return fail(textRef(REJECT.targetUnreachable));

    const { cells, targets } = templateArea(
        map,
        ps,
        caster,
        targeting,
        aim,
        rules
    );

    if (cells.length === 0)
        return fail(textRef('battleActions.spell.target.pickDirection'));

    return {
        ok: true,
        targetIds: passing(targets),
        cells,
        centre: templateCentre(targeting, aim, cells, grid),
    };
}

function resolveSkillRadius(
    scene: AimScene,
    radius: SkillRadius,
    aim: { cell?: GridPoint; range?: number }
): SpellTargetResolution {
    const grid = gridOf(scene.map);

    if (!aim.cell) return fail(textRef('battleActions.spell.target.pickPoint'));

    if (!inBounds(scene.map, aim.cell))
        return fail(textRef('battleActions.spell.target.pointOutOfMap'));

    if (
        !aimInRange(
            cellsOf(scene.caster, grid),
            aim.cell,
            aim.range,
            scene.rules,
            grid
        )
    )
        return fail(textRef('battleActions.spell.target.pointOutOfRange'));

    const hidden = modeAimHiddenText(scene.map, scene.caster, aim.cell);

    if (hidden) return fail(hidden);

    if (!wallsAllowAim(scene.map, scene.caster, aim.cell))
        return fail(textRef(REJECT.targetUnreachable));

    const { cells, targets } = skillRadiusArea(scene, radius, aim.cell);

    return {
        ok: true,
        targetIds: targets.map((p) => p.basicInfo.id),
        cells,
        centre: aim.cell,
    };
}

function outOfRange(
    caster: BattleParticipant,
    picked: BattleParticipant[],
    range: number | undefined,
    rules: Ruleset,
    grid: GridKind
): boolean {
    if (range === undefined) return false;

    const max = feetToCells(range, rules);

    return picked.some(
        (p) =>
            p.battleData.position !== undefined &&
            footprintDistance(
                cellsOf(caster, grid),
                cellsOf(p, grid),
                grid
            ) > max
    );
}

function resolveRaw(
    ps: BattleParticipant[],
    caster: BattleParticipant,
    spell: SpellRef,
    targeting: SpellTargetingDef,
    chosenIds: string[],
    mapCtx?: SpellMapContext
): SpellTargetResolution {
    const side = caster.basicInfo.side;

    const live =
        mapCtx?.map && isOnMap(caster)
            ? { map: mapCtx.map, rules: mapCtx.rules }
            : null;

    const map = live?.map ?? null;

    if (live && targeting.kind === 'template')
        return resolveTemplate(
            ps,
            caster,
            targeting,
            live.map,
            mapCtx?.targetCell,
            { spellLevel: spell.level, castLevel: mapCtx?.castLevel },
            live.rules
        );

    if (targeting.kind === 'ally' || targeting.kind === 'enemy') {
        const skill = spellTargetingFor(ps, caster.basicInfo.id, spell);

        if (skill.mode === 'all') {
            const all = sightedTargets(
                map,
                ps,
                caster,
                skillAllTargets(ps, caster, targeting.kind, map)
            );

            return all.length > 0
                ? { ok: true, targetIds: all }
                : fail(textRef('battleActions.spell.target.noTargets'));
        }

        if (live && skill.mode === 'area') {
            return resolveSkillRadius(
                { map: live.map, participants: ps, caster, rules: live.rules },
                { side: targeting.kind, maxTargets: skill.maxTargets },
                { cell: mapCtx?.targetCell, range: targeting.range }
            );
        }
    }

    const ids = (filter: (p: BattleParticipant) => boolean) =>
        ps.filter(filter).map((p) => p.basicInfo.id);

    const chosen = [...new Set(chosenIds)].map((id) => findParticipant(ps, id));

    if (chosen.some((p) => !p))
        return fail(textRef('battleActions.spell.target.targetMissing'));

    const picked = chosen as BattleParticipant[];

    if (picked.some(isAirborne))
        return fail(textRef(API_ERRORS.TARGET_AIRBORNE));

    if (
        live &&
        'range' in targeting &&
        outOfRange(
            caster,
            picked,
            targeting.range,
            live.rules,
            gridOf(live.map)
        )
    )
        return fail(textRef('battleActions.spell.target.targetOutOfRange'));

    const targetHidden =
        map && SIGHTED_KINDS.has(targeting.kind)
            ? modeTargetHiddenText(map, caster, picked)
            : null;

    if (targetHidden) return fail(targetHidden);

    if (
        map &&
        (targeting.kind === 'ally' || targeting.kind === 'enemy') &&
        picked.some((p) => !wallsAllowSight(map, caster, p))
    )
        return fail(textRef(REJECT.targetUnreachable));

    const sighted = (filter: (p: BattleParticipant) => boolean) =>
        sightedTargets(map, ps, caster, ids(filter));

    switch (targeting.kind) {
        case 'self':
            return { ok: true, targetIds: [caster.basicInfo.id] };
        case 'allAllies':
            return {
                ok: true,
                targetIds: ids(
                    (p) => isTargetable(p) && p.basicInfo.side === side
                ),
            };
        case 'allEnemies':
            return {
                ok: true,
                targetIds: sighted(
                    (p) => isTargetable(p) && isHostile(map, caster, p)
                ),
            };
        case 'everyone':
            return { ok: true, targetIds: sighted(isTargetable) };
        case 'allAlliesDead': {
            const fallen = ids(
                (p) => !isActive(p) && p.basicInfo.side === side
            );

            return fallen.length > 0
                ? { ok: true, targetIds: fallen }
                : fail(textRef('battleActions.spell.target.noFallen'));
        }
        case 'allyDead': {
            if (picked.length !== 1)
                return fail(
                    textRef('battleActions.spell.target.pickOneFallen')
                );

            return picked[0].basicInfo.side === side && !isActive(picked[0])
                ? { ok: true, targetIds: [picked[0].basicInfo.id] }
                : fail(textRef('battleActions.spell.target.mustBeFallen'));
        }
        case 'ally':
        case 'enemy':
        case 'area':
        case 'template': {
            const multi =
                targeting.kind === 'area' || targeting.kind === 'template';

            const wanted = multi ? targeting.side : targeting.kind;

            if (picked.length === 0)
                return fail(textRef('battleActions.spell.target.pickTarget'));

            if (
                picked.some(
                    (p) =>
                        !(
                            isActive(p) ||
                            ((wanted === 'ally' || wanted === 'all') &&
                                isDying(p))
                        ) ||
                        (wanted !== 'all' &&
                            !isHostile(map, caster, p) !== (wanted === 'ally'))
                )
            ) {
                return fail(
                    textRef(
                        wanted === 'ally'
                            ? 'battleActions.spell.target.mustBeAlly'
                            : 'battleActions.spell.target.mustBeEnemy'
                    )
                );
            }

            if (
                picked.some(
                    (p) =>
                        !matchesTargetFilter(
                            p,
                            targeting.filter,
                            {
                                spellLevel: spell.level,
                                castLevel: mapCtx?.castLevel,
                            },
                            mapCtx?.rules
                        )
                )
            )
                return fail(API_ERRORS.BATTLE_SPELL_TARGET_FILTER);

            if (map && targeting.kind === 'area' && targeting.chain) {
                if (picked.length !== 1)
                    return fail(
                        textRef('battleActions.spell.target.pickChainFirst')
                    );

                return {
                    ok: true,
                    targetIds: spellChain(
                        { participants: ps, caster },
                        targeting,
                        picked[0],
                        map
                    ).map((p) => p.basicInfo.id),
                };
            }

            const base = multi
                ? { mode: 'single' as const, maxTargets: targeting.maxTargets }
                : spellTargetingFor(ps, caster.basicInfo.id, spell);

            const skill = multi
                ? base
                : {
                      ...base,
                      maxTargets:
                          base.maxTargets + upcastExtra(caster, spell, mapCtx),
                  };

            if ('projectiles' in targeting && targeting.projectiles) {
                const cap = multi
                    ? skill.maxTargets
                    : projectileCap(caster, spell, skill.maxTargets);

                return spreadProjectiles(
                    picked.map((p) => p.basicInfo.id),
                    chosenIds,
                    cap
                );
            }

            if (!validateSpellTargetCount(skill, picked.length))
                return fail(textRef('battleActions.spell.target.tooMany'));

            return { ok: true, targetIds: picked.map((p) => p.basicInfo.id) };
        }
    }
}

const upcastExtra = (
    caster: BattleParticipant,
    spell: SpellRef,
    mapCtx?: SpellMapContext
): number =>
    (mapCtx?.castLevel !== undefined &&
    mapCtx.upcastTargets &&
    casterPicksSlot(caster, mapCtx.rules)
        ? mapCtx.upcastTargets *
          ruleSystemOf(mapCtx.rules).magic.upcast.steps(
              spell.level,
              mapCtx.castLevel
          )
        : 0) + (mapCtx?.extension?.extraTargets ?? 0);

function stretched(
    targeting: SpellTargetingDef,
    ext: CastExtension | undefined
): SpellTargetingDef {
    if (!ext) return targeting;

    const rangeMul = ext.rangeMul ?? 1;

    const withRange =
        rangeMul > 1 &&
        'range' in targeting &&
        targeting.range !== undefined &&
        targeting.range > TOUCH_FEET
            ? { ...targeting, range: targeting.range * rangeMul }
            : targeting;

    return withRange.kind === 'template' && (ext.areaMul ?? 1) > 1
        ? { ...withRange, size: withRange.size * (ext.areaMul ?? 1) }
        : withRange;
}

const HOSTILE_KINDS = new Set(['enemy', 'area', 'template', 'allEnemies']);

function hostile(targeting: SpellTargetingDef): boolean {
    if (targeting.kind === 'area' || targeting.kind === 'template')
        return targeting.side !== 'ally';

    return HOSTILE_KINDS.has(targeting.kind);
}

export function pacifiedBlock(
    ps: BattleParticipant[],
    caster: BattleParticipant,
    targeting: SpellTargetingDef,
    targetIds: string[],
    map?: BattleMapConfig | null
): { state: string } | null {
    const marker = findEffectMarker(caster, 'no_hostile_spells');

    if (!marker) return null;

    const hitsEnemy = targetIds.some((id) => {
        const t = ps.find((p) => p.basicInfo.id === id);

        return !!t && isHostile(map, caster, t);
    });

    return hostile(targeting) || hitsEnemy
        ? { state: marker.effect.name }
        : null;
}

export function resolveSpellTargets(
    ps: BattleParticipant[],
    caster: BattleParticipant,
    spell: SpellRef,
    targeting: SpellTargetingDef,
    chosenIds: string[],
    mapCtx?: SpellMapContext
): SpellTargetResolution {
    const extra = upcastExtra(caster, spell, mapCtx);

    const reached = stretched(targeting, mapCtx?.extension);

    const widened =
        extra > 0 && (reached.kind === 'area' || reached.kind === 'template')
            ? { ...reached, maxTargets: reached.maxTargets + extra }
            : reached;

    const res = resolveRaw(ps, caster, spell, widened, chosenIds, mapCtx);

    const charmers = conditionSourceIds(caster, 'charmed', ps);

    if (!res.ok || !charmers.length || !hostile(targeting)) return res;

    const targetIds = res.targetIds.filter((id) => !charmers.includes(id));

    if (targetIds.length === res.targetIds.length) return res;

    if (targetIds.length === 0)
        return fail(textRef('battleActions.spell.target.charmerHostile'));

    if ('projectiles' in targeting && targeting.projectiles)
        return spreadProjectiles(
            [...new Set(targetIds)],
            targetIds,
            res.targetIds.length
        );

    return { ...res, targetIds };
}
