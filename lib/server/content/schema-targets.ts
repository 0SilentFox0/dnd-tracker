import 'server-only';
import type { ContentKind } from '@/lib/server/content/define-resource';
import { CONTENT_RESOURCES } from '@/lib/server/content/resources';
import { systemContent } from '@/lib/server/systems/registry';

export const KINDS = Object.keys(CONTENT_RESOURCES) as [
    ContentKind,
    ...ContentKind[],
];

export const EXTRA = [
    'abilities',
    'rules',
    ...Object.keys(systemContent('schemaTargets')),
] as const;

export type SchemaTarget = ContentKind | 'abilities' | 'rules' | (string & {});

export const SCHEMA_TARGETS = [...KINDS, ...EXTRA] as [
    SchemaTarget,
    ...SchemaTarget[],
];
