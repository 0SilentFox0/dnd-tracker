import { NextResponse } from "next/server";

import { getSessionUserId } from "@/lib/auth";
import { CampaignRole } from "@/lib/constants/campaigns";
import { prisma } from "@/lib/db";
import { createClient } from "@/lib/supabase/server";

export interface AuthResult {
  userId: string;
}

export interface AuthUserResult extends AuthResult {
  authUser: {
    id: string;
    email?: string | null;
    user_metadata?: {
      full_name?: string;
      name?: string;
      avatar_url?: string;
      picture?: string;
    } | null;
  };
}

export interface CampaignAccessResult extends AuthResult {
  campaign: {
    id: string;
    maxLevel: number;
    xpMultiplier: number;
    members: Array<{ userId: string; role: string }>;
  };
}

const unauthorized = () => NextResponse.json({ error: "Unauthorized" }, { status: 401 });

/** Session check from the JWT claims — verified locally, no Supabase Auth round trip. */
export async function requireAuth(): Promise<AuthResult | NextResponse> {
  const userId = await getSessionUserId();

  return userId ? { userId } : unauthorized();
}

/** Fresh email / user_metadata from Supabase Auth — only where a DB user row is created. */
export async function requireAuthUser(): Promise<AuthUserResult | NextResponse> {
  const supabase = await createClient();

  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) return unauthorized();

  return {
    userId: authUser.id,
    authUser: {
      id: authUser.id,
      email: authUser.email,
      user_metadata: authUser.user_metadata,
    },
  };
}

/**
 * Перевіряє авторизацію та доступ до кампанії
 * @param campaignId ID кампанії
 * @param requireDM Якщо true, перевіряє що користувач є DM
 * @returns CampaignAccessResult або NextResponse з помилкою
 */
export async function requireCampaignAccess(
  campaignId: string,
  requireDM: boolean = false
): Promise<CampaignAccessResult | NextResponse> {
  const authResult = await requireAuth();

  if (authResult instanceof NextResponse) {
    return authResult;
  }

  const { userId } = authResult;

  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    include: {
      members: {
        where: { userId },
      },
    },
  });

  if (!campaign) {
    return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
  }

  if (campaign.members.length === 0) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Якщо потрібен DM доступ
  if (requireDM && campaign.members[0]?.role !== CampaignRole.DM) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return {
    ...authResult,
    campaign: {
      id: campaign.id,
      maxLevel: campaign.maxLevel,
      xpMultiplier: campaign.xpMultiplier,
      members: campaign.members.map((m) => ({
        userId: m.userId,
        role: m.role,
      })),
    },
  };
}

/**
 * Перевіряє авторизацію та що користувач є DM кампанії
 * @param campaignId ID кампанії
 * @returns CampaignAccessResult або NextResponse з помилкою
 */
export async function requireDM(
  campaignId: string
): Promise<CampaignAccessResult | NextResponse> {
  return requireCampaignAccess(campaignId, true);
}

/**
 * Перевіряє що елемент належить до кампанії
 * @param item Campaign ID елемента
 * @param campaignId Очікуваний Campaign ID
 * @returns NextResponse з помилкою або null якщо все ок
 */
export function validateCampaignOwnership(
  item: { campaignId: string } | null,
  campaignId: string
): NextResponse | null {
  if (!item) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (item.campaignId !== campaignId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return null;
}
