import type { z } from 'zod';

import type {
    adminRangeSchema,
    adminUsersQuerySchema,
} from '@/lib/schemas/admin';
import type { CohortRow } from '@/lib/utils/admin/cohorts';

export type AdminRange = z.infer<typeof adminRangeSchema>;

export type Tile = { value: number; delta: number | null };

export type Row = { key: string; n: number };

export type AdminOverview = {
    range: AdminRange;
    dataSince: string | null;
    tiles: {
        usersTotal: number;
        usersNew: Tile;
        usersDeleted: Tile;
        netGrowth: number;
        dau: number;
        wau: number;
        mau: number;
        stickiness: number | null;
        campaignsTotal: number;
        campaignsNew: Tile;
        templatesTotal: number;
        battles: Tile;
        withAiKey: number;
        activationRate: number | null;
    };
    series: {
        days: string[];
        signups: number[];
        deletions: number[];
        usersTotal: number[];
        dau: number[];
        wau: number[];
        mau: number[];
        campaigns: number[];
        battles: number[];
        characters: number[];
    };
    cohorts: CohortRow[];
    breakdowns: { locale: Row[]; system: Row[]; country: Row[] };
};

export type AdminUsersQuery = z.infer<typeof adminUsersQuerySchema>;

export type AdminUserRow = {
    id: string;
    email: string;
    displayName: string;
    avatar: string | null;
    createdAt: string;
    lastActiveAt: string | null;
    lastSignInAt: string | null;
    bannedUntil: string | null;
    campaignsDm: number;
    templates: number;
    memberships: number;
    characters: number;
    country: string | null;
    sharedIp: boolean;
    subscription: null;
};

export type AdminUsersPage = {
    rows: AdminUserRow[];
    next: string | null;
    authMetaAvailable: boolean;
};
