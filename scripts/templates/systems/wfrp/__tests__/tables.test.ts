import { describe, expect, it } from 'vitest';

import { tableIssues } from '../validate';

const rows = (n: number) =>
    Array.from({ length: n }, (_, i) => ({
        max: i === n - 1 ? 100 : (i + 1) * 10,
        text: 't',
        effects: [] as object[],
    }));

const asRules = (value: unknown) => value as Parameters<typeof tableIssues>[0];

describe('tableIssues', () => {
    it.each([undefined, {}, { tables: { miscastMinor: rows(8) } }])(
        'accepts %j',
        (rules) => expect(tableIssues(asRules(rules))).toEqual([])
    );

    it('rejects a slot the template does not use', () => {
        expect(tableIssues(asRules({ tables: { critHead: rows(8) } }))).toEqual(
            ['rules: tables.critHead is not used by the Grim template']
        );
    });

    it('rejects a wrong row count', () => {
        expect(tableIssues(asRules({ tables: { wrath: rows(5) } }))).toEqual([
            'rules: tables.wrath must have 8–10 rows (got 5)',
        ]);
    });

    it('requires row text', () => {
        const r = rows(8);

        delete (r[0] as { text?: string }).text;
        expect(tableIssues(asRules({ tables: { miscastMajor: r } }))).toEqual([
            'rules: tables.miscastMajor[0] needs text of 1–120 characters',
        ]);
    });

    it('rejects an unconscious condition', () => {
        const r = rows(8);

        r[0].effects = [{ type: 'condition', key: 'unconscious', levels: 1 }];
        expect(tableIssues(asRules({ tables: { miscastMinor: r } }))).toEqual([
            'rules: tables.miscastMinor[0] condition "unconscious" is not allowed',
        ]);
    });
});
