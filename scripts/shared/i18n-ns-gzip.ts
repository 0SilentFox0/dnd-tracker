import { gzipSync } from 'node:zlib';

import { LOCALES, type Namespace } from '@/lib/i18n/config';
import { loadMessages } from '@/lib/i18n/messages';

const namespaces = process.argv.slice(2) as Namespace[];

if (namespaces.length === 0) {
    console.error('usage: tsx scripts/shared/i18n-ns-gzip.ts <namespace...>');
    process.exit(1);
}

async function main() {
    for (const locale of LOCALES) {
        const messages = await loadMessages(locale, namespaces);

        const kb = gzipSync(JSON.stringify(messages), { level: 9 }).length / 1024;

        console.log(`${locale} ${namespaces.join('+')}: ${kb.toFixed(3)} KB gzip`);
    }
}

void main();
