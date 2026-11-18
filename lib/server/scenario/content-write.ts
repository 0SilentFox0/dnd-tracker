import { toInputJson } from '@/lib/utils/common/json';
import { buildSearchText } from '@/lib/utils/scenario/search-text';
import type { ScenarioContent } from '@/types/scenario';

export const toJson = (content: ScenarioContent) =>
    toInputJson(content);

export const contentWrite = (title: string, content: ScenarioContent) => ({
    content: toJson(content),
    searchText: buildSearchText(title, content),
});
