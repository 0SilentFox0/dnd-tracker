import { DM_ARTICLES } from "./dm";
import { PLAYER_ARTICLES } from "./player";

import type { HelpArticle } from "@/lib/onboarding/types";

export const HELP_ARTICLES: HelpArticle[] = [...DM_ARTICLES, ...PLAYER_ARTICLES];

export const getHelpArticle = (slug: string) => HELP_ARTICLES.find((a) => a.slug === slug);
