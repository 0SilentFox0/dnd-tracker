import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

import {
    countLiterals,
    isLiteralAllowed,
    literalTokens,
    readImportsExempt,
    readLiteralsExempt,
    ROOT,
    scanLiterals,
    sourceFiles,
    SYSTEM_ROOTS,
} from '@/scripts/shared/system-ratchet';

describe('system literals ratchet', () => {
    const exempt = readLiteralsExempt();

    const found = scanLiterals();

    it('counts match the recorded numbers exactly', () => {
        const problems = [
            ...Object.entries(found)
                .filter(([file, n]) => n > (exempt[file] ?? 0))
                .map(
                    ([file, n]) =>
                        `new leak: ${file} has ${n}, allowed ${exempt[file] ?? 0}`
                ),
            ...Object.entries(exempt)
                .filter(([file, max]) => (found[file] ?? 0) < max)
                .map(
                    ([file, max]) =>
                        `lower the entry: ${file} has ${found[file] ?? 0}, recorded ${max}`
                ),
        ];

        expect(problems).toEqual([]);
    });

    it('scans neither systems/ nor system-owned folders', () => {
        const tokens = literalTokens();

        expect(
            Object.keys(found).filter(
                (f) => f.startsWith('systems/') || isLiteralAllowed(f, tokens)
            )
        ).toEqual([]);
    });

    describe('countLiterals', () => {
        const tokens = literalTokens();

        it('counts wfrp case-insensitively as a substring', () =>
            expect(
                countLiterals('const WFRP_X = wfrpThing; // Wfrp', tokens)
            ).toBe(3));

        it('counts a base module id only as a quoted literal', () => {
            expect(
                countLiterals('const a = "d20"; const b = d20;', tokens)
            ).toBe(1);
            expect(countLiterals('const k = "homm";', tokens)).toBe(1);
        });

        it('counts a template key outside the registry', () =>
            expect(countLiterals('const k = "srd-5.2";', tokens)).toBe(1));

        it('ignores unrelated text', () =>
            expect(countLiterals('const x = 1; // plain', tokens)).toBe(0));
    });

    it('allows system folders and the template registry', () => {
        const tokens = literalTokens();

        expect(isLiteralAllowed('systems/d20/index.ts', tokens)).toBe(false);
        expect(
            isLiteralAllowed('scripts/templates/systems/wfrp/units.ts', tokens)
        ).toBe(true);
        expect(
            isLiteralAllowed('scripts/templates/grim-d100/validate.ts', tokens)
        ).toBe(true);
        expect(
            isLiteralAllowed('lib/utils/templates/registry.ts', tokens)
        ).toBe(true);
        expect(
            isLiteralAllowed(
                'scripts/sim/battle-sweep/profiles/grim-d100.ts',
                tokens
            )
        ).toBe(true);
        expect(
            isLiteralAllowed('scripts/sim/battle-sweep/run.ts', tokens)
        ).toBe(false);
        expect(isLiteralAllowed('lib/utils/battle/foo.ts', tokens)).toBe(false);
        expect(isLiteralAllowed('scripts/templates/lib/foo.ts', tokens)).toBe(
            false
        );
    });
});

describe('wfrp leaks outside the allowed files', () => {
    const ALLOWED = new Set([
        ...readImportsExempt().map((e) => e.file),
        'lib/onboarding/whats-new.ts',
        'lib/constants/api-errors.ts',
        'lib/server/assistant/actions/character-coverage.ts',
        'app/campaigns/[id]/dm/careers/careers-client.tsx',
    ]);

    const literals = readLiteralsExempt();

    it('only route / content-kind / ruleset-section files, whats-new, api-errors, character-coverage and the careers page mention wfrp', () => {
        const leaks = Object.keys(literals).filter(
            (file) =>
                /wfrp/i.test(fs.readFileSync(path.join(ROOT, file), 'utf8')) &&
                !ALLOWED.has(file)
        );

        expect(leaks).toEqual([]);
    });

    it('no core file compares to the wfrp key or names its constants', () => {
        const roots = new Set(SYSTEM_ROOTS);

        const offenders = sourceFiles(['lib', 'app', 'components', 'types'])
            .filter(
                (file) =>
                    !roots.has(file) &&
                    !readImportsExempt().some((e) => e.file === file) &&
                    file !== 'lib/constants/api-errors.ts'
            )
            .filter((file) =>
                /=== "wfrp"|isWfrpCampaign|\bWFRP_|\.wfrp\b|\b(?:system|characteristics)\.kind === "d20"/.test(
                    fs.readFileSync(path.join(ROOT, file), 'utf8')
                )
            );

        expect(offenders).toEqual([]);
    });
});

describe('d20 / HOMM names and rule-section readers leaving core', () => {
    // Counts files (not hits) in lib/ app/ components/ types/ scripts/ except registry roots and scripts/templates/systems/**.
    // A number may only fall: both growth and a stale (too high) maximum fail. Target is 0 once Part 2+ moves the rules out.
    const roots = new Set(SYSTEM_ROOTS);

    const files = sourceFiles().filter(
        (f) => !roots.has(f) && !f.startsWith('scripts/templates/systems/')
    );

    const texts = new Map(
        files.map((f) => [f, fs.readFileSync(path.join(ROOT, f), 'utf8')])
    );

    const filesMatching = (re: RegExp) =>
        files.filter((f) => re.test(texts.get(f) ?? ''));

    const check = (
        table: Record<string, number>,
        toRegExp: (key: string) => RegExp
    ) => {
        const problems = Object.entries(table).flatMap(([key, max]) => {
            const n = filesMatching(toRegExp(key)).length;

            if (n > max) return [`${key}: ${n} files, max ${max}`];

            return n < max
                ? [`${key}: lower the maximum to ${n} (was ${max})`]
                : [];
        });

        expect(problems).toEqual([]);
    };

    const LEAK_NAMES: Record<string, number> = {
        'D20_[A-Z]+': 0,
        judgeD20: 0,
        CONDITION_5E_: 11,
        applyCondition5e: 0,
        isHomm: 0,
        'HOMM_[A-Z]+': 2,
        proficiencyForLevel: 0,
        spellcastingDerived: 0,
        heroHpFormula: 0,
        'HERO_INITIATIVE\\b': 0,
        getHeroMaxHpBreakdown: 0,
        heroHpFallback: 0,
        learnedSpellIdsFromNodes: 0,
        resolveLearnedSpellsAndMastery: 0,
        conditionTestMutation: 0,
        systemConditionMutation: 0,
        coreActionMutation: 0,
        careersResource: 0,
        createWfrpDraft: 0,
        patchWfrpDraft: 0,
        saveRaceProfile: 0,
        systemCharacterRoute: 0,
        listRaceProfiles: 0,
        profileRefIds: 0,
        moraleOutcome: 0,
        moraleTriggerRolls: 0,
        needsMoraleCheck: 0,
        isFiveE: 0,
        '\\bchannelledSl\\b': 1,
        '\\bconditionTests\\b': 1,
        '\\bpsychologyTested\\b': 1,
        'battleData\\??\\.(fortune|sin)\\b': 0,
        '\\battackedWithLight\\b': 1,
        '\\binspirationSpent\\b': 1,
        '\\bretaliationsUsed\\b': 1,
        'battleData\\??\\.(deathSaves|inspiration|attackedWithLight|retaliationsUsed)\\b': 0,
    };

    const RULES_SECTION_READERS: Record<string, number> = {
        morale: 0,
        heroScaling: 0,
        criticals: 0,
        deathSaves: 0,
        concentration: 0,
        conditions: 0,
        actions: 0,
        classes: 0,
        encounters: 0,
        formulas: 0,
        initiative: 0,
        saves: 0,
    };

    it('leaked names stay under their maximum', () =>
        check(LEAK_NAMES, (p) => new RegExp(p)));

    // Items a section keeps in core (encounters.balance/unitGroups) are not leaks: only the module-owned ones count
    const OWNED_ITEMS: Record<string, string> = {
        encounters: 'edition|autoXp',
    };

    it('reads of rules.<section> stay under their maximum', () =>
        check(
            RULES_SECTION_READERS,
            (s) =>
                new RegExp(
                    `\\b(?:rules|ruleset|ruleSet|sections)\\??\\.${s}\\b${
                        OWNED_ITEMS[s] ? `\\??\\.(?:${OWNED_ITEMS[s]})\\b` : ''
                    }`
                )
        ));
});
