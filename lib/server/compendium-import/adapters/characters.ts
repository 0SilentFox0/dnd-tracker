import { nestedId, stableJson } from "../identity";
import { type Adapter, issue } from "../types";
import { ABILITIES, abilityChoices, array, description, num, object, skillName, skills, str, uidRef, unsupported } from "./shared";

export const background: Adapter = (row, ctx) => {
  const skill = skills(row.skillProficiencies, ctx);

  const tools = array(row.toolProficiencies).flatMap((v) => Object.entries(object(v)).filter(([k, enabled]) => enabled === true && !/^(?:any|choose)/.test(k)).map(([k]) => k));

  const choices = [...abilityChoices(row.ability, ctx), ...skill.choices];

  if (row.startingEquipment !== undefined) ctx.issues.push(issue("MANUAL_EQUIPMENT", `${ctx.path}.startingEquipment`, "warning", "ДМ: видайте спорядження та гроші вручну після створення персонажів"));

  const featRefs = array(row.feats).flatMap((v) => Object.entries(object(v)).filter(([, enabled]) => enabled === true).map(([k]) => k));

  const refs = featRefs.length === 1 ? [uidRef(featRefs[0], "feat", ["originFeatId"], ctx)] : [];

  if (row.feats !== undefined && featRefs.length !== 1) ctx.issues.push(issue("BACKGROUND_FEAT_CHOICE", `${ctx.path}.feats`, "error", "Оберіть конкретну рису походження або виключіть передісторію"));

  const notes = [unsupported(row, ["ability", "feats", "skillProficiencies", "startingEquipment"], ctx), row.toolProficiencies ? `toolProficiencies: ${stableJson(row.toolProficiencies)}` : "", row.skillProficiencies ? `skillProficiencies: ${stableJson(row.skillProficiencies)}` : ""].filter(Boolean).join("\n");

  return { kind: "backgrounds", body: { name: row.name, description: description(row, ctx), choices, skillProficiencies: skill.fixed, toolProficiencies: tools, originFeatId: null, equipmentText: row.startingEquipment ? stableJson(row.startingEquipment) : null }, refs, notes };
};

export const feat: Adapter = (row, ctx) => {
  const categories: Record<string, string> = { O: "origin", G: "general", FS: "fightingStyle", EB: "epicBoon" };

  const type = categories[str(row.category)] ?? "general";

  if (row.category !== undefined && !categories[str(row.category)]) ctx.issues.push(issue("UNSUPPORTED_FEAT_CATEGORY", `${ctx.path}.category`));

  const manualText = row.prerequisite ? [stableJson(row.prerequisite)] : [];

  if (manualText.length) ctx.issues.push(issue("MANUAL_PREREQUISITE", `${ctx.path}.prerequisite`, "warning", "ДМ: перевірте вимоги до вибору риси"));

  const skill = skills(row.skillProficiencies, ctx);

  const fixedSkills = skill.fixed.map((id) => ({ id: `import-skill-${id.toLowerCase()}`, label: id, kind: "skill", count: 1, skills: [id] }));

  return { kind: "feats", body: { name: row.name, description: description(row, ctx), type, repeatable: row.repeatable === true, prerequisite: { manualText }, choices: [...abilityChoices(row.ability, ctx), ...skill.choices, ...fixedSkills], abilities: [] }, notes: unsupported(row, ["category", "repeatable", "prerequisite", "ability", "skillProficiencies"], ctx) };
};

export const race: Adapter = (row, ctx) => {
  const skill = skills(row.skillProficiencies, ctx);

  const choices = [...abilityChoices(row.ability, ctx), ...skill.choices, ...skill.fixed.map((s) => ({ id: `import-skill-${s.toLowerCase()}`, label: s, kind: "skill", count: 1, skills: [s] }))];

  return { kind: "races", body: { name: row.name, passiveAbility: { description: description(row, ctx) }, choices, abilities: [] }, notes: unsupported(row, ["ability", "skillProficiencies"], ctx) };
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

  return { kind: "classes", body: { name: row.name, hitDie: hd, caster: caster ?? "none", savingThrows: array(row.proficiency).map((s) => ABILITIES[str(s)]).filter(Boolean), proficiencies: fields, spellcastingAbility: ABILITIES[str(row.spellcastingAbility)] ?? null, skillChoices: { count: num(choose.count) ?? 0, from: array(choose.from).map((s) => skillName(str(s))).filter(Boolean) }, features: [], subclasses: [], subclassLevel: null }, notes: unsupported(row, ["hd", "proficiency", "casterProgression", "spellcastingAbility", "startingProficiencies", "classFeatures"], ctx) };
};

export const featureDescription = (row: Record<string, unknown>, key: string) => ({ id: nestedId(key), name: str(row.name), description: str(row.description), abilities: [] });
