import type { QuestObjectiveView } from '@/types/quests';
export function objectiveView(
    objective: {
        id: string;
        title: string;
        completed: boolean;
        visible: boolean;
    },
    isDM: boolean
): QuestObjectiveView {
    if (!isDM && !objective.visible) return { hidden: true };

    return {
        hidden: false,
        id: objective.id,
        title: objective.title,
        completed: objective.completed,
        visible: objective.visible,
    };
}
