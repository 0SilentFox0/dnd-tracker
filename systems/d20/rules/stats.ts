import {
    CHARACTER_SYSTEM_COLUMNS,
    type CharacterSystemColumn,
} from '@/lib/constants/stat-columns';

export const D20_STAT_COLUMNS: readonly CharacterSystemColumn[] =
    CHARACTER_SYSTEM_COLUMNS.filter((column) => column !== 'archetype');
