import {
    campaignDelete,
    campaignGet,
    campaignPost,
    campaignPut,
} from './client';

import type { QuestInput, QuestList } from '@/types/quests';
export const getQuests = (id: string) => campaignGet<QuestList>(id, '/quests');
export const saveQuest = (id: string, data: QuestInput, questId?: string) =>
    questId
        ? campaignPut<{ id: string }>(id, `/quests/${questId}`, data)
        : campaignPost<{ id: string }>(id, '/quests', data);
export const deleteQuest = (id: string, questId: string) =>
    campaignDelete(id, `/quests/${questId}`);
export const trackQuest = (id: string, questId: string, tracked: boolean) =>
    campaignPut(id, `/quests/${questId}/tracking`, { tracked });
