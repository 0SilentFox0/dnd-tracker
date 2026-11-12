import { writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { magicVariants } from '../../srd/convert/magic-items';
import { buildSrdData } from '../../srd/lib/build-data';
import { coverage4f5b } from '../../srd/lib/coverage-4f5b';
import { writeSrdData } from '../../srd/lib/data-files';
import { fetchOpen5e, verifySourceDir } from '../../srd/lib/fetch';
import { loadOpen5e } from '../../srd/lib/open5e';
import { SRD_KINDS, type SrdData } from '../../srd/lib/types';
import type { SourceAdapter } from '../lib/build';

const KEY = 'srd-5.2';

const argOf = (args: string[], name: string) =>
    args.includes(name) ? args[args.indexOf(name) + 1] : undefined;

/** Open5e slugs may carry an apostrophe, which the pack slug format rejects. */
const cleanSlugs = (data: SrdData): SrdData =>
    Object.fromEntries(
        SRD_KINDS.map((kind) => [
            kind,
            data[kind].map((row) => ({
                ...row,
                slug: row.slug.replace(/['’]/g, ''),
            })),
        ])
    ) as unknown as SrdData;

const adapter: SourceAdapter = {
    async build({ dir, args }) {
        const given = argOf(args, '--source');

        const source = given ? verifySourceDir(given) : await fetchOpen5e();

        const open5e = loadOpen5e(source);

        const data = cleanSlugs(buildSrdData(open5e));

        const out = join(dir, KEY);

        const manifest = writeSrdData(data, out);

        writeFileSync(
            join(out, 'coverage-4f5b.json'),
            `${JSON.stringify(coverage4f5b(data), null, 2)}\n`
        );

        console.info(`SRD 5.2 → ${out}`);

        for (const [kind, count] of Object.entries(manifest.counts))
            console.info(`  ${kind}: ${count}`);

        const notes = data.classes
            .flatMap((c) => [
                ...c.features,
                ...c.subclasses.flatMap((s) => s.features),
            ])
            .flatMap((f) => f.abilities);

        console.info(
            `  spells with effects: ${data.spells.filter((s) => s.spellEffects.length > 0).length}/${data.spells.length}`
        );
        console.info(
            `  composed names verified: ${
                magicVariants(
                    open5e,
                    data.artifacts.filter((a) => a.rarity === 'common')
                ).length
            }`
        );
        console.info(
            `  class abilities with mechanics: ${notes.filter((a) => a.effects.some((e) => e.kind !== 'note')).length}/${notes.length}`
        );
    },
};

export default adapter;
