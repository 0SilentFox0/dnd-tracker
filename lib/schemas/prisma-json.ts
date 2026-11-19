// skill_tree_progress.progress JSON shape (not validated on read)
export type SkillTreeProgress = Record<
    string,
    { level?: 'basic' | 'advanced' | 'expert'; unlockedSkills?: string[] }
>;
