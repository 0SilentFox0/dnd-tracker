export const CharacterLogKind = {
  CHECK: "check",
  SAVE: "save",
  SHORT_REST: "short_rest",
  LONG_REST: "long_rest",
  REST_CLOSED: "rest_closed",
  HIT_DIE: "hit_die",
  XP: "xp",
  INSPIRATION: "inspiration",
  RESOURCES_EDIT: "resources_edit",
  CHOICES_EDIT: "choices_edit",
  BATTLE_RESULT: "battle_result",
} as const;

export type CharacterLogKindValue = (typeof CharacterLogKind)[keyof typeof CharacterLogKind];

export const CHARACTER_LOG_PAGE_SIZE = 30;
