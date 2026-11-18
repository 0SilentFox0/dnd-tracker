import type { SystemMeta } from '@/lib/utils/rules/systems/meta';

export const ARTIFACTSETS_META = {
    module: 'artifactsets',
    kind: 'addon',
    keys: [],
    aliases: ['artifactSet'],
    requires: ['d20'],
    i18n: {},
    dmSections: ['artifact-sets'],
    contentKinds: ['artifact-sets'],
    contentTables: [
        {
            key: 'artifactSets',
            model: 'ArtifactSet',
            delegate: 'artifactSet',
            kind: 'artifact-sets',
            order: 20,
            detach: 'artifactSet',
        },
    ],
    detachRefs: [{ kind: 'artifactSet', model: 'artifact', column: 'setId' }],
    vocab: {
        abilitySources: [
            { id: 'artifactSet', itemLike: true, table: 'artifact_sets' },
        ],
    },
    importLinks: {
        artifacts: ['artifact-sets'],
        'artifact-sets': ['artifacts'],
    },
} as const satisfies SystemMeta;
