import type { Prisma } from "@prisma/client";

import { buildSearchText } from "@/lib/utils/scenario/search-text";
import type { ScenarioContent } from "@/types/scenario";

export const toJson = (content: ScenarioContent) => content as unknown as Prisma.InputJsonValue;

export const contentWrite = (title: string, content: ScenarioContent) => ({ content: toJson(content), searchText: buildSearchText(title, content) });
