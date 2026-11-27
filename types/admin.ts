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

export type AdminUserDetail = {
    user: AdminUserRow & { locale: string | null; timeZone: string | null };
    owned: {
        id: string;
        name: string;
        kind: string;
        system: string | null;
        players: number;
        createdAt: string;
        updatedAt: string;
    }[];
    joined: {
        id: string;
        name: string;
        dm: { id: string; displayName: string };
    }[];
    templates: {
        id: string;
        name: string;
        versions: number;
        clones: number;
        blocksDeletion: boolean;
    }[];
    activityDays: string[];
    access: {
        ip: string;
        country: string | null;
        device: string | null;
        firstSeen: string;
        lastSeen: string;
        days: number;
        otherAccounts: { id: string; displayName: string; email: string }[];
    }[];
    actions: {
        at: string;
        action: string;
        adminUserId: string;
        meta: unknown;
    }[];
};

export type AdminCampaignSummary = {
    id: string;
    name: string;
    kind: string;
    status: string;
    system: string | null;
    createdAt: string;
    updatedAt: string;
    owner: { id: string; displayName: string; email: string };
    members: { id: string; displayName: string; role: string }[];
    counts: {
        characters: number;
        battles: number;
        maps: number;
        scenarioPages: number;
        units: number;
        spells: number;
    };
    storageBytes: number | null;
    template: { versions: number; clones: number } | null;
};
