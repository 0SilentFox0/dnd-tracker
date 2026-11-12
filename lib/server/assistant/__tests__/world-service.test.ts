import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
    findCampaign: vi.fn(),
    findWorldMap: vi.fn(),
    findCharacters: vi.fn(),
    activePlayerHeroes: vi.fn(),
    readPositions: vi.fn(),
}));

vi.mock('@/lib/db', () => ({
    prisma: {
        campaign: { findUnique: mocks.findCampaign },
        worldMap: { findFirst: mocks.findWorldMap },
        character: { findMany: mocks.findCharacters },
    },
}));
vi.mock('@/lib/server/world/map-handlers', () => ({ subtreeTargets: vi.fn() }));
vi.mock('@/lib/server/world/map-store', () => ({
    orphanedImagesOfSubtree: vi.fn(),
    toWorldMap: vi.fn(),
    toWorldMarker: vi.fn(),
}));
vi.mock('@/lib/server/world/note-store', () => ({
    noteInclude: {},
    toNote: vi.fn(),
}));
vi.mock('@/lib/server/world/rest', () => ({ applyWorldRest: vi.fn() }));
vi.mock('@/lib/server/world/travel-store', () => ({
    activePlayerHeroes: mocks.activePlayerHeroes,
    commitTravel: vi.fn(),
    readPositions: mocks.readPositions,
    toDmHeroes: vi.fn(),
    writeRestLog: vi.fn(),
}));

import { prepareWorldAction } from '../actions/world-service';

const caller = {
    actor: {
        campaignId: 'campaign-1',
        userId: 'dm-1',
        isDM: true,
        via: 'token',
        scopes: ['world:write'],
    },
    channel: 'mcp',
    threadId: null,
    tokenId: 'token-1',
    locale: 'en',
} as never;

describe('world action preview fingerprint', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mocks.findWorldMap.mockResolvedValue({
            id: 'map-1',
            campaignId: 'campaign-1',
        });
        mocks.activePlayerHeroes.mockResolvedValue([
            { id: 'hero-1', name: 'Hero', avatar: null },
        ]);
        mocks.readPositions.mockResolvedValue(
            new Map([
                [
                    'hero-1',
                    { characterId: 'hero-1', mapId: 'map-1', x: 0.4, y: 0.6 },
                ],
            ])
        );
        mocks.findCharacters.mockResolvedValue([
            { id: 'hero-1', resources: { hitDice: 2 }, classes: [] },
        ]);
        mocks.findCampaign.mockImplementation(async () => ({
            rules: {
                outOfCombat: {
                    persistResources: true,
                    longRestHitDice: 'half',
                },
                classes: { enabled: true },
            },
        }));
    });

    it('invalidates a rest preview when campaign rest rules change', async () => {
        const input = {
            mapId: 'map-1',
            characterIds: ['hero-1'],
            kind: 'long',
        };

        const preview = await prepareWorldAction(caller, 'rest', input);

        mocks.findCampaign.mockResolvedValue({
            rules: {
                outOfCombat: { persistResources: true, longRestHitDice: 'all' },
                classes: { enabled: true },
            },
        });

        const refreshedPreview = await prepareWorldAction(
            caller,
            'rest',
            input
        );

        expect(refreshedPreview.preconditions).not.toEqual(
            preview.preconditions
        );
    });
});
