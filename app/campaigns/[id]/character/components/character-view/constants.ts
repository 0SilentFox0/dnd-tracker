/** No-op setters for read-only view (satisfies required prop types). */
export const noopBasicInfoSetters = {
  setName: () => {},
  setType: () => {},
  setControlledBy: () => {},
  setLevel: () => {},
  setClass: () => {},
  setSubclass: () => {},
  setRace: () => {},
  setSubrace: () => {},
  setAlignment: () => {},
  setBackground: () => {},
  setExperience: () => {},
  setAvatar: () => {},
};

export const noopAbilitySetters = {
  setStrength: () => {},
  setDexterity: () => {},
  setConstitution: () => {},
  setIntelligence: () => {},
  setWisdom: () => {},
  setCharisma: () => {},
};

export const noopCombatSetters = {
  setArmorClass: () => {},
  setInitiative: () => {},
  setSpeed: () => {},
  setHitDice: () => {},
  setMinTargets: () => {},
  setMaxTargets: () => {},
  setMorale: () => {},
};

export const noopSkillHandlers = {
  toggleSavingThrow: () => {},
  toggleSkill: () => {},
};

export const noopAbilitiesSetters = {
  setPersonalSkillId: () => {},
};
