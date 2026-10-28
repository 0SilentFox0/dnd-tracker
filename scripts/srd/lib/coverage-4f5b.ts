import type { SrdData } from "./types";

type Note = { source: string; category: string; reason: string };

/** Reports residual rules explicitly; full source prose remains on each content row. */
export function coverage4f5b(data: SrdData) {
  const unsupported: Note[] = [];

  for (const item of data.artifacts) {
    const add = (category: string, reason: string) => unsupported.push({ source: item.name, category, reason });

    if (/\bcast\b/i.test(item.description) && !item.item?.spells?.length) add("item-spell", "Немає однозначного підтриманого запису spell/cost/level; каст за описом виконує ДМ.");


    if (/regains? [^.]*\d+d\d+/i.test(item.description)) add("charge-recovery", "Кидок відновлення зарядів не автоматизовано; чинне відновлення детерміноване, ДМ коригує лічильник.");

    if (/last charge|last.*charge/i.test(item.description)) add("item-destruction", "Випадкове знищення після останнього заряду визначає ДМ.");

    if (/^(?:Mace of Disruption|Giant Slayer|Holy Avenger)$/.test(item.name)) add("creature-effect-residual", "Автоматизовано лише перевірену додаткову шкоду за типом істоти; знищення, повалення та аура з опису лишаються ручними.");

    if (/Potion of Resistance/.test(item.name)) add("effect-duration", "Параметр збережено в стеку; одногодинний ефект із виходом за межі бою ДМ враховує вручну.");
  }
  unsupported.push(
    { source: "Spell Scroll", category: "scroll-eligibility", reason: "ДМ визначає право читання; автоматизовано каст, DC13/attack5 і списання лише для явних у джерелі кіл 0–1." },
    { source: "Breath Weapon", category: "attack-replacement", reason: "Дві форми ділять пул; рушій витрачає дію, заміну однієї атаки враховує ДМ." },
    { source: "Lineage / Magic Initiate", category: "casting-ability-choice", reason: "Окремий вибір характеристики героя з тексту фічі не автоматизовано; грант використовує задану dcAbility або основну характеристику героя." },
  );

  return {
    supported: {
      itemSpells: data.artifacts.filter((a) => a.item?.spells?.length).map((a) => ({ name: a.name, spells: a.item?.spells?.length })),
      parameterizedItems: data.artifacts.filter((a) => a.item?.parameter).map((a) => a.name),
      breathVariants: data.spells.filter((s) => s.slug.startsWith("srd-2024_dragonborn-breath-")).map((s) => s.name),
      heroGrants: ["Elf / Gnome / Tiefling", "Magic Initiate", "Mystic Arcanum 6/7/8/9", "Signature Spells"],
    },
    unsupported,
  };
}
