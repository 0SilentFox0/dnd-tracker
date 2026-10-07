import { NextResponse } from "next/server";

import { getSessionUserId } from "@/lib/auth";
import { API_ERRORS } from "@/lib/constants/api-errors";
import { prisma } from "@/lib/db";
import { createClient } from "@/lib/supabase/server";
import { errorResponse } from "@/lib/utils/api/api-response";
import { isDmMember } from "@/lib/utils/api/is-dm";

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
  isDM: boolean;
  campaign: {
    id: string;
    maxLevel: number;
    xpMultiplier: number;
    members: Array<{ userId: string; role: string }>;
  };
}

const unauthorized = () => errorResponse(API_ERRORS.UNAUTHORIZED, 401);

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
    return errorResponse(API_ERRORS.CAMPAIGN_NOT_FOUND, 404);
  }

  if (campaign.members.length === 0) {
    return errorResponse(API_ERRORS.FORBIDDEN, 403);
  }

  const isDM = isDmMember(campaign.members);

  if (requireDM && !isDM) {
    return errorResponse(API_ERRORS.FORBIDDEN, 403);
  }

  return {
    ...authResult,
    isDM,
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

export async function requireDM(
  campaignId: string
): Promise<CampaignAccessResult | NextResponse> {
  return requireCampaignAccess(campaignId, true);
}
