import { NextResponse } from 'next/server';

import { API_ERRORS } from '@/lib/constants/api-errors';
import type { SystemHandler } from '@/lib/server/systems/types';
import { errorResponse } from '@/lib/utils/api/api-response';
import { PRIVATE_NO_STORE_HEADERS } from '@/lib/utils/api/cache-headers';
import { ruleSystemOf } from '@/lib/utils/rules/systems';
import type { SpeciesProfile } from '@/systems/wfrp/rules/creation';
import {
    listRaceProfiles,
    saveRaceProfile,
} from '@/systems/wfrp/server/race-profile';
import { SpeciesProfileSchema } from '@/systems/wfrp/server/schemas';

type SaveInput = { query: { raceId: string }; body: SpeciesProfile };

export const raceProfilesHandler: SystemHandler = {
    access: 'member',
    handle: async ({ campaignId }) =>
        NextResponse.json(
            { profiles: await listRaceProfiles(campaignId) },
            { headers: PRIVATE_NO_STORE_HEADERS }
        ),
};

export const raceProfileSaveHandler: SystemHandler = {
    access: 'dm',
    schema: SpeciesProfileSchema,
    query: (searchParams) => ({ raceId: searchParams.get('raceId') ?? '' }),
    handle: async ({ campaignId, access, input }) => {
        const { query, body } = input as SaveInput;

        if (!query.raceId) return errorResponse(API_ERRORS.INVALID_QUERY, 400);

        if (!ruleSystemOf(access.campaign.rules).creation)
            return errorResponse(API_ERRORS.SYSTEM_DRAFTS_UNSUPPORTED, 409);

        return NextResponse.json(
            await saveRaceProfile(campaignId, query.raceId, body)
        );
    },
};
