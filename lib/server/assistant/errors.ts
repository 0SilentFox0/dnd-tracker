import { API_ERRORS } from "@/lib/constants/api-errors";
import { ContentError } from "@/lib/server/content/errors";

export const forbidden = () => new ContentError(API_ERRORS.ASSISTANT_ACTION_FORBIDDEN, 403);

export const conflict = () => new ContentError(API_ERRORS.ASSISTANT_PROPOSAL_STALE, 409);
