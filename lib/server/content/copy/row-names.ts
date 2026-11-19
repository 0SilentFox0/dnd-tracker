import { CONTENT_KINDS } from '@/lib/constants/content-kinds';
import { type BundleTable, tableOfKind } from '@/lib/server/templates/bundle';

export const nameOf = (row: Record<string, unknown>) =>
    String(row.name ?? row.title ?? row.id);

export const kindOfTable = (table: BundleTable | string) =>
    CONTENT_KINDS.find((k) => tableOfKind(k)?.key === table);
