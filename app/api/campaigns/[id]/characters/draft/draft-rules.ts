import { API_ERRORS } from "@/lib/constants/api-errors";
import { CampaignRole } from "@/lib/constants/campaigns";
import { type AbilityMethod, type AbilityScores, validateAbilityScores } from "@/lib/utils/characters/generate";

export function draftRejection({ role, existing, method, scores }: { role: string; existing: number; method: AbilityMethod; scores: AbilityScores }): string | null {
  if (role !== CampaignRole.PLAYER) return API_ERRORS.DRAFT_PLAYERS_ONLY;

  if (existing > 0) return API_ERRORS.DRAFT_ALREADY_EXISTS;

  if (!validateAbilityScores(scores, method)) return API_ERRORS.DRAFT_INVALID_SCORES;

  return null;
}
