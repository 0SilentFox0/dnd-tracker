import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { describe, expect, it } from 'vitest';

import {
    renderDictionariesModule,
    renderManifestsModule,
    writeIndex,
} from '../lib/index-gen';
import {
    listPackKeys,
    packPath,
    readManifest,
    TEMPLATES_DIR,
} from '../lib/pack';

const read = (file: string) =>
    fs.readFileSync(path.join(TEMPLATES_DIR, file), 'utf8');

const dictionaryPacks = () =>
    listPackKeys().map((key) => ({
        key,
        locales: readManifest(key).locales.filter(
            (locale) =>
                locale !== 'en' &&
                fs.existsSync(packPath(key, `i18n/${locale}.json`))
        ),
    }));

describe('template index', () => {
    it('generated modules are fresh', () => {
        expect(read('manifests.ts')).toBe(
            renderManifestsModule(listPackKeys())
        );
        expect(read('dictionaries.server.ts')).toBe(
            renderDictionariesModule(dictionaryPacks())
        );
    });

    it('readManifest rejects a key that differs from the folder name', () => {
        const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'packs-'));

        fs.mkdirSync(path.join(dir, 'other'));
        fs.copyFileSync(
            packPath('grim-d100', 'manifest.json'),
            path.join(dir, 'other/manifest.json')
        );

        expect(() => readManifest('other', dir)).toThrow(/does not match/);
    });

    it('writeIndex only lists locales with a dictionary file', () => {
        const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'packs-'));

        fs.mkdirSync(path.join(dir, 'grim-d100'));
        fs.copyFileSync(
            packPath('grim-d100', 'manifest.json'),
            path.join(dir, 'grim-d100/manifest.json')
        );
        writeIndex(dir);

        expect(
            fs.readFileSync(path.join(dir, 'dictionaries.server.ts'), 'utf8')
        ).not.toContain('uk:');
    });

    it('packs hold data only, no .ts files', () => {
        for (const key of listPackKeys()) {
            const stack = [path.join(TEMPLATES_DIR, key)];

            while (stack.length) {
                const current = stack.pop() as string;

                for (const entry of fs.readdirSync(current, {
                    withFileTypes: true,
                })) {
                    if (entry.isDirectory())
                        stack.push(path.join(current, entry.name));
                    else expect(entry.name.endsWith('.ts')).toBe(false);
                }
            }
        }
    });
});
