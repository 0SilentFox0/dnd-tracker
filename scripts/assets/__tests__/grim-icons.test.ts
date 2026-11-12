import * as fs from 'fs';
import * as path from 'path';
import { describe, expect, it } from 'vitest';

import { findForbiddenTerms } from '../../templates/grim-d100/forbidden-terms';
import { readPack } from '../../templates/lib/pack';
import {
    WFRP_ROW_KINDS,
    wfrpDataOf,
} from '../../templates/systems/wfrp/common';
import { grimPromptRows, type GrimSubjects } from '../grim-icons/prompts';

const readSubject = <T>(name: string) =>
    JSON.parse(
        fs.readFileSync(
            path.join(__dirname, '..', 'icon-subjects', `grim-${name}.json`),
            'utf8'
        )
    ) as T;

const subjects = (): GrimSubjects => ({
    units: readSubject('units'),
    spells: readSubject('spells'),
    artifacts: readSubject('artifacts'),
    identity: readSubject('identity'),
});

const data = wfrpDataOf(readPack('grim-d100'));

describe('grim icon prompts', () => {
    it('covers every catalog entry with a clean prompt and a unique file', () => {
        const rows = grimPromptRows(data, subjects());

        expect(rows).toHaveLength(
            WFRP_ROW_KINDS.reduce((n, k) => n + data[k].length, 0)
        );
        expect(rows).toHaveLength(186);
        expect(new Set(rows.map((r) => r.file)).size).toBe(rows.length);
        expect(
            rows.filter((r) => findForbiddenTerms(r.prompt).length > 0)
        ).toEqual([]);
    });

    it('throws with the name when a subject is missing', () => {
        const s = subjects();

        delete s.units['Ash Hound'];

        expect(() => grimPromptRows(data, s)).toThrow('Ash Hound');
    });
});
