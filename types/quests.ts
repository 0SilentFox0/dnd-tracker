export type { QuestInput } from '@/lib/schemas/quests';
export type QuestObjectiveView =
    | { hidden: true }
    | {
          hidden: false;
          id: string;
          title: string;
          completed: boolean;
          visible: boolean;
      };
export interface QuestView {
    id: string;
    title: string;
    description: string;
    kind: 'main' | 'side';
    status: 'active' | 'completed' | 'failed';
    visible: boolean;
    notes: string;
    reward: string;
    tracked: boolean;
    marker: { id: string; mapId: string; name: string } | null;
    objectives: QuestObjectiveView[];
}
export interface QuestList {
    items: QuestView[];
}
