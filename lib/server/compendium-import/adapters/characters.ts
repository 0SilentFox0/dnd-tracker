import { stableJson } from "../identity";
import { type Adapter, issue } from "../types";
import { equipmentText, featPrerequisite, featSpells, proficiencyText, raceTraits, resistFlags } from "./character-traits";
import { ABILITIES, abilityChoices, array, description, num, object, skillName, skills, str, uidRef, unsupported } from "./shared";

export const background: Adapter = (row, ctx) => {
  const issuesBefore = ctx.issues.length;

  const skill = skills(row.skillProficiencies, ctx);

  const customSkills = ctx.issues.length > issuesBefore;

  const tools = array(row.toolProficiencies).flatMap((v) => Object.entries(object(v)).filter(([k, enabled]) => enabled === true && !/^(?:any|choose)/.test(k)).map(([k]) => k));

  const toolText = proficiencyText(row.toolProficiencies);

  if (toolText.choice) ctx.issues.push(issue("MANUAL_TOOL_CHOICE", `${ctx.path}.toolProficiencies`, "warning", "Рушій не має вибору інструментів: виберіть їх вручну (вказано в описі)"));

  const languages = proficiencyText(row.languageProficiencies).text;

  const head = [toolText.choice ? `Інструменти: ${toolText.text}` : "", languages ? `Мови: ${languages}` : ""].filter(Boolean).join("\n");

  const choices = [...abilityChoices(row.ability, ctx), ...skill.choices];

  if (row.startingEquipment !== undefined) ctx.issues.push(issue("MANUAL_EQUIPMENT", `${ctx.path}.startingEquipment`, "warning", "ДМ: видайте спорядження та гроші вручну після створення персонажів"));

  const featRefs = array(row.feats).flatMap((v) => Object.entries(object(v)).filter(([, enabled]) => enabled === true).map(([k]) => k));

  const refs = featRefs.length === 1 ? [uidRef(featRefs[0], "feat", ["originFeatId"], ctx)] : [];

  if (row.feats !== undefined && featRefs.length !== 1) ctx.issues.push(issue("BACKGROUND_FEAT_CHOICE", `${ctx.path}.feats`, "error", "Оберіть конкретну рису походження або виключіть передісторію"));

  const notes = [unsupported(row, ["ability", "feats", "skillProficiencies", "startingEquipment", "toolProficiencies", "languageProficiencies"], ctx), toolText.choice ? `toolProficiencies: ${stableJson(row.toolProficiencies)}` : "", customSkills ? `skillProficiencies: ${stableJson(row.skillProficiencies)}` : ""].filter(Boolean).join("\n");

  const equipment = row.startingEquipment !== undefined ? equipmentText(row.startingEquipment) : "";

  return { kind: "backgrounds", body: { name: row.name, description: [head, description(row, ctx)].filter(Boolean).join("\n\n"), choices, skillProficiencies: skill.fixed, toolProficiencies: tools, originFeatId: null, equipmentText: equipment || null }, refs, notes };
};

export const feat: Adapter = (row, ctx) => {
  const categories: Record<string, string> = { O: "origin", G: "general", FS: "fightingStyle", EB: "epicBoon" };

  const type = categories[str(row.category)] ?? "general";

  if (row.category !== undefined && !categories[str(row.category)]) ctx.issues.push(issue("UNSUPPORTED_FEAT_CATEGORY", `${ctx.path}.category`));

  const prerequisite = featPrerequisite(row.prerequisite, ctx);

  const skill = skills(row.skillProficiencies, ctx);

  const fixedSkills = skill.fixed.map((id) => ({ id: `import-skill-${id.toLowerCase()}`, label: id, kind: "skill", count: 1, skills: [id] }));

  const baseChoices = [...abilityChoices(row.ability, ctx), ...skill.choices, ...fixedSkills];

  const spells = featSpells(row.additionalSpells, ctx, baseChoices.length);

  if (spells.manual.length > 0) ctx.issues.push(issue("MANUAL_FEAT_SPELLS", `${ctx.path}.additionalSpells`, "warning", "Частину заклинань риси (без обмежень, розширений список, фільтр школи) рушій не моделює: застосовуйте за описом"));

  const resist = row.resist !== undefined ? resistFlags(row.resist) : undefined;

  if (resist && !resist.complete) ctx.issues.push(issue("MANUAL_FEAT_RESIST", `${ctx.path}.resist`, "warning", "Опір шкоді з вибором або складною умовою рушій не моделює: застосовуйте за описом"));

  const abilities = resist && resist.effects.length > 0 ? [{ id: "resist", name: "Опір шкоді", trigger: { event: "passive" }, effects: resist.effects }] : [];

  const notes = [unsupported(row, ["category", "repeatable", "prerequisite", "ability", "skillProficiencies", "additionalSpells", "resist"], ctx), spells.manual.length > 0 ? `additionalSpells: ${stableJson(spells.manual)}` : "", resist && !resist.complete ? `resist: ${stableJson(row.resist)}` : ""].filter(Boolean).join("\n");

  return { kind: "feats", body: { name: row.name, description: description(row, ctx), type, repeatable: row.repeatable === true, prerequisite, choices: [...baseChoices, ...spells.choices], abilities }, refs: spells.refs, notes };
};

export const race: Adapter = (row, ctx) => {
  const skill = skills(row.skillProficiencies, ctx);

  const choices = [...abilityChoices(row.ability, ctx), ...skill.choices, ...skill.fixed.map((s) => ({ id: `import-skill-${s.toLowerCase()}`, label: s, kind: "skill", count: 1, skills: [s] }))];

  const traits = raceTraits(row, ctx);

  return { kind: "races", body: { name: row.name, passiveAbility: { description: [traits.head.join("\n"), description(row, ctx)].filter(Boolean).join("\n\n") }, choices, abilities: traits.abilities }, notes: unsupported(row, ["ability", "skillProficiencies", "size", "speed", "darkvision", "blindsight", "tremorsense", "truesight", "languageProficiencies", "resist", "lineage", "traitTags", "age"], ctx) };
};

export const gameClass: Adapter = (row, ctx) => {
  const casterTypes: Record<string, string> = { full: "full", half: "half", "1/2": "half", "1/3": "third", third: "third", pact: "pact", none: "none" };

  const caster = row.casterProgression === undefined ? "none" : casterTypes[str(row.casterProgression)];

  if (!caster) ctx.issues.push(issue("UNKNOWN_CASTER", `${ctx.path}.casterProgression`, "error", "Укажіть тип заклинача"));

  const hd = num(object(row.hd).faces);

  if (![6, 8, 10, 12].includes(hd ?? 0)) ctx.issues.push(issue("CLASS_HIT_DIE", `${ctx.path}.hd`, "error", "Укажіть кістку хітів класу"));

  const prof = object(row.startingProficiencies);

  const skill = object(array(prof.skills)[0]);

  const choose = object(skill.choose);

  const fields = { armor: array(prof.armor).map(str).filter(Boolean), weapons: array(prof.weapons).map(str).filter(Boolean), tools: array(prof.tools).map(str).filter(Boolean) };

  return { kind: "classes", body: { name: row.name, hitDie: hd, caster: caster ?? "none", savingThrows: array(row.proficiency).map((s) => ABILITIES[str(s)]).filter(Boolean), proficiencies: fields, spellcastingAbility: ABILITIES[str(row.spellcastingAbility)] ?? null, skillChoices: { count: num(choose.count) ?? 0, from: array(choose.from).map((s) => skillName(str(s))).filter(Boolean) }, features: [], subclasses: [], subclassLevel: null }, notes: unsupported(row, ["hd", "proficiency", "casterProgression", "spellcastingAbility", "startingProficiencies", "classFeatures", "optionalfeatureProgression"], ctx) };
};
