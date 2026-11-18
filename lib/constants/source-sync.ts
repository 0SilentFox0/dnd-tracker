import {
    SYNC_TABLE_SCOPES,
    type SyncTableScope,
} from '@/lib/utils/rules/systems/content-tables';

export { SYNC_TABLE_SCOPES };

export const SYNC_SCOPES = [
    ...SYNC_TABLE_SCOPES,
    'rules',
    'settings',
] as unknown as readonly [
    SyncTableScope | 'rules' | 'settings',
    ...Array<SyncTableScope | 'rules' | 'settings'>,
];

export const SYNC_STATUSES = [
    'new',
    'updated',
    'conflict',
    'deletedInSource',
    'deletedLocally',
] as const;

export const SYNC_DEFAULT_ON: ReadonlySet<string> = new Set(['new', 'updated']);

export const syncStatusKey = (
    status: (typeof SYNC_STATUSES)[number],
    fromTemplate: boolean
) =>
    fromTemplate && status === 'deletedInSource' ? 'deletedInTemplate' : status;

export const syncTitleKey = (isTemplate: boolean) =>
    isTemplate ? 'fromSource' : 'fromTemplate';
