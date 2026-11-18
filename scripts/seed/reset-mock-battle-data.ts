#!/usr/bin/env tsx
import { execSync } from 'child_process';

import { DEFAULT_CAMPAIGN_ID } from '@/scripts/shared/default-campaign';

const CAMPAIGN_ID = process.argv[2] || DEFAULT_CAMPAIGN_ID;

if (!CAMPAIGN_ID || CAMPAIGN_ID === 'YOUR_CAMPAIGN_ID') {
    console.error('❌ Помилка: Вкажіть ID кампанії як аргумент:');
    console.error('   npm run reset-mock-battle YOUR_CAMPAIGN_ID');
    process.exit(1);
}

console.log('🔄 Скидання мок даних...\n');

try {
    console.log('🗑️  Крок 1: Видалення старих моків...');
    execSync(`tsx scripts/seed/delete-mock-battle-data.ts ${CAMPAIGN_ID}`, {
        stdio: 'inherit',
    });

    console.log('\n🌱 Крок 2: Створення нових моків...');
    execSync(`tsx scripts/seed/seed-mock-battle-data.ts ${CAMPAIGN_ID}`, {
        stdio: 'inherit',
    });

    console.log('\n✅ Моки успішно скинуті та створені заново!');
} catch (error) {
    console.error('\n❌ Помилка при скиданні моків:', error);
    process.exit(1);
}
