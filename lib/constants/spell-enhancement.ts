export enum SpellEnhancementType {
  EFFECT_INCREASE = "effect_increase",
  TARGET_CHANGE = "target_change",
  ADDITIONAL_MODIFIER = "additional_modifier",
  NEW_SPELL = "new_spell",
  /** Обрані заклинання (тип «одна ціль») у бою вибираються як AOE */
  AOE_SPELL_UNLOCK = "aoe_spell_unlock",
}

export const SPELL_ENHANCEMENT_TYPES = [
  { value: SpellEnhancementType.EFFECT_INCREASE, label: "Збільшення ефекту" },
  { value: SpellEnhancementType.TARGET_CHANGE, label: "Зміна Таргету" },
  { value: SpellEnhancementType.ADDITIONAL_MODIFIER, label: "Додатковий модифікатор" },
  { value: SpellEnhancementType.NEW_SPELL, label: "Нове заклинання" },
  {
    value: SpellEnhancementType.AOE_SPELL_UNLOCK,
    label: "Відкрити AOE для обраних заклинань",
  },
] as const;
