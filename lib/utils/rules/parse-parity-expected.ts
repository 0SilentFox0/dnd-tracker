import type { Ruleset } from './schema';
import { ALL_SECTIONS } from './section-registry';

type Section = keyof Ruleset;

export type ExpectedDifference = {
    id: string;
    section: Section;
    reason: string;
    /** Exact item paths (`section.item`) the difference may appear on */
    paths: readonly string[];
    applies: (raw: Record<string, unknown>, next: Ruleset) => boolean;
};

const rawSection = (
    raw: Record<string, unknown>,
    section: Section
): Record<string, unknown> | null => {
    const value = raw[section];

    return value && typeof value === 'object' && !Array.isArray(value)
        ? (value as Record<string, unknown>)
        : null;
};

const sameJson = (a: unknown, b: unknown) =>
    JSON.stringify(a) === JSON.stringify(b);

export const EXPECTED_DIFFERENCES: ExpectedDifference[] = [
    {
        id: 'unknown extra key in section',
        section: 'saves',
        reason: 'an unknown sub-key no longer drops the whole section to defaults',
        paths: ['saves.proficiency'],
        applies: (raw, next) => {
            const stored = rawSection(raw, 'saves');

            return (
                !!stored &&
                Object.keys(stored).some(
                    (key) => !Object.hasOwn(ALL_SECTIONS.saves.items, key)
                ) &&
                sameJson(stored.proficiency, next.saves.proficiency)
            );
        },
    },
    {
        id: 'invalid custom condition item',
        section: 'conditions',
        reason: 'an invalid conditions.custom falls back to its own default, enabled/exhaustion are kept',
        paths: [
            'conditions.enabled',
            'conditions.exhaustion',
            'conditions.custom',
        ],
        applies: (raw, next) => {
            const stored = rawSection(raw, 'conditions');

            if (
                !stored ||
                !Array.isArray(stored.custom) ||
                ALL_SECTIONS.conditions.items.custom.schema.safeParse(
                    stored.custom
                ).success
            )
                return false;

            return (
                sameJson(stored.enabled, next.conditions.enabled) &&
                sameJson(stored.exhaustion, next.conditions.exhaustion)
            );
        },
    },
];

export const expectedDifferenceFor = (
    path: string,
    raw: unknown,
    next: Ruleset
): ExpectedDifference | undefined => {
    const source =
        raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};

    return EXPECTED_DIFFERENCES.find(
        (entry) => entry.paths.includes(path) && entry.applies(source, next)
    );
};
