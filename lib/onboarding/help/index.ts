import { DM_ARTICLES } from "./dm";
import { PLAYER_ARTICLES } from "./player";

import type { HelpArticleDef } from "@/lib/onboarding/types";

export const HELP_ARTICLES: HelpArticleDef[] = [...DM_ARTICLES, ...PLAYER_ARTICLES];

export const getHelpArticle = (slug: string) => HELP_ARTICLES.find((a) => a.slug === slug);
