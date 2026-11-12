import 'server-only';
import type {
    AnyContentResource,
    ContentKind,
} from '@/lib/server/content/define-resource';
import { artifactsResource } from '@/lib/server/content/resources/artifacts';
import { featsResource } from '@/lib/server/content/resources/feats';
import { racesResource } from '@/lib/server/content/resources/races';
import { spellGroupsResource } from '@/lib/server/content/resources/spell-groups';
import { spellsResource } from '@/lib/server/content/resources/spells';
import { tracksResource } from '@/lib/server/content/resources/tracks';
import { unitsResource } from '@/lib/server/content/resources/units';
import { systemContentKinds } from '@/lib/server/systems/registry';

export const CORE_CONTENT_RESOURCES = {
    units: unitsResource,
    races: racesResource,
    feats: featsResource,
    spells: spellsResource,
    'spell-groups': spellGroupsResource,
    artifacts: artifactsResource,
    tracks: tracksResource,
} satisfies Partial<Record<ContentKind, AnyContentResource>>;

type ModuleKind = Exclude<ContentKind, keyof typeof CORE_CONTENT_RESOURCES>;

export const CONTENT_RESOURCES = {
    ...CORE_CONTENT_RESOURCES,
    ...Object.fromEntries(
        Object.entries(systemContentKinds()).map(([kind, k]) => [
            kind,
            k.resource,
        ])
    ),
} as typeof CORE_CONTENT_RESOURCES & Record<ModuleKind, AnyContentResource>;
