import { API_ERRORS } from "@/lib/constants/api-errors";
import type { Translator } from "@/lib/i18n/translator";

const JOIN_ERROR_KEYS: Array<[string, string]> = [
  [API_ERRORS.CAMPAIGN_NOT_FOUND, "common.joinErrors.campaignNotFound"],
  [API_ERRORS.ALREADY_MEMBER, "common.joinErrors.alreadyMember"],
  [API_ERRORS.CAMPAIGN_NOT_ACTIVE, "common.joinErrors.campaignNotActive"],
];

export function joinErrorMessage(err: unknown, t: Translator): string {
  if (!(err instanceof Error)) return t("common.joinErrors.failed");

  const source = (err as { errorKey?: string }).errorKey ?? err.message;

  const match = JOIN_ERROR_KEYS.find(([needle]) => source.includes(needle));

  return match ? t(match[1]) : err.message;
}
