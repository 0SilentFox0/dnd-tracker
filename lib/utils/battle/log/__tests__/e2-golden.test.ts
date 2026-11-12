import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { eventTextOf } from './event-text';

const DIR = join(__dirname, 'fixtures/e2-golden');

const TEMPLATES = ['srd-5.2', 'heroes-homm', 'grim-d100'] as const;

interface GoldenEvent {
    seq: number;
    round: number;
    type: string;
    resultText: string;
    details: { log: never[] };
}

const read = <T>(name: string): T =>
    JSON.parse(readFileSync(join(DIR, name), 'utf8')) as T;

describe.each(TEMPLATES)('e2 golden journal %s', (template) => {
    const events = read<GoldenEvent[]>(`${template}.json`);

    it('renders every line exactly as committed', () => {
        const rendered = events.map((e) => ({
            seq: e.seq,
            type: e.type,
            text: eventTextOf(e),
        }));

        if (process.env.UPDATE_GOLDEN)
            writeFileSync(
                join(DIR, `${template}.rendered.json`),
                `${JSON.stringify(rendered, null, 1)}\n`
            );

        expect(rendered).toEqual(read(`${template}.rendered.json`));
    });

    it('renders no raw message keys', () => {
        for (const e of events)
            expect(eventTextOf(e)).not.toMatch(
                /\b(battleLog|battleTerms|abilityText|battleActions)\./
            );
    });
});
