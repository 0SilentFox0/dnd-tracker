import type { ImportKind } from '@/types/content-import';

export type PerField<T> = Readonly<Record<string, T>>;

export type Pair = readonly [string, string];

export type Examples = Record<ImportKind, PerField<Pair>>;
