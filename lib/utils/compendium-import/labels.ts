import { COMPENDIUM_INFO_ISSUE_CODES, type JsonRecord } from "@/lib/constants/compendium-import";
import { isRecord } from "@/lib/utils/common/is-record";
import type { ImportIssue } from "@/types/compendium-import";

const INPUT_KIND_LABELS: Record<string, string> = { spell: "Заклинання", monster: "Юніт", item: "Предмет", baseitem: "Базовий предмет", race: "Раса", subrace: "Підраса", background: "Передісторія", feat: "Риса", class: "Клас", classFeature: "Вміння класу", subclass: "Підклас", subclassFeature: "Вміння підкласу", optionalfeature: "Опційне вміння", book: "Книга", bookData: "Сторінки книги", adventure: "Пригода", adventureData: "Сторінки пригоди", table: "Таблиця", reward: "Нагорода", condition: "Стан", skill: "Навичка", language: "Мова", itemProperty: "Властивість предмета", itemType: "Тип предмета", spellSchool: "Школа магії", mergeParent: "Батьківський запис" };

const TARGET_KIND_LABELS: Record<string, string> = { units: "Юніт", spells: "Заклинання", "spell-groups": "Група заклинань", artifacts: "Предмет", races: "Раса", classes: "Клас", feats: "Риса", backgrounds: "Передісторія", scenarioPages: "Сторінка сценарію" };

export const kindLabel = (kind: string) => kind.startsWith("template:") ? `${TARGET_KIND_LABELS[kind.slice(9)] ?? kind.slice(9)} (шаблон)` : INPUT_KIND_LABELS[kind] ?? TARGET_KIND_LABELS[kind] ?? kind;

export const editionLabel = (edition: string) => edition === "classic" ? "класична 5e" : edition === "one" ? "5e 2024" : "редакція не вказана";

function leadingKey(text: string): { key: unknown[]; rest: string } | undefined {
  if (!text.startsWith("[1,")) return;

  let depth = 0, inString = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];

    if (inString) { if (c === "\\") i++; else if (c === '"') inString = false; } else if (c === '"') inString = true;
    else if (c === "[") depth++;
    else if (c === "]" && --depth === 0) {
      try {
        const key = JSON.parse(text.slice(0, i + 1));

        return Array.isArray(key) ? { key, rest: text.slice(i + 1).replace(/^\./, "") } : undefined;
      } catch { return; }
    }
  }
}

function keyLabel(key: unknown[]) {
  const [, kind, source, , name, parent] = key;

  const owner = Array.isArray(parent) && parent.length ? ` (${parent.join(", ")})` : "";

  return `${kindLabel(String(kind))} «${String(name)}»${owner}${source ? ` · ${String(source)}` : ""}`;
}

export function entryLabel(key: string) {
  const parsed = leadingKey(key);

  return parsed ? keyLabel(parsed.key) : key;
}

export function readablePath(path: string) {
  const parsed = leadingKey(path);

  if (parsed) return parsed.rest ? `${keyLabel(parsed.key)} · поле ${parsed.rest}` : keyLabel(parsed.key);

  const input = /^([a-zA-Z]+)\[(\d+)\](.*)$/.exec(path);

  if (input) return `${INPUT_KIND_LABELS[input[1]] ?? input[1]} №${Number(input[2]) + 1} у файлі${input[3] ? ` · ${input[3].replace(/^\./, "")}` : ""}`;

  return path;
}

export const statusLabel = (status: string) => status === "create" ? "створити" : status === "update" ? "оновити" : status === "unchanged" ? "без змін" : status === "error" ? "помилка" : status;

export const coverageLabel = (coverage: string) => coverage === "native" ? "структуровано" : coverage === "manual" ? "вручну" : "частково";

const ISSUE_CODE_LABELS: Record<string, string> = {
  MANUAL: "Налаштувати вручну",
  MANUAL_SPELL: "Механіку заклинань налаштувати вручну",
  MANUAL_EQUIPMENT: "Спорядження видати вручну",
  MANUAL_FEAT: "Механіку рис налаштувати вручну",
  MANUAL_FEAT_SPELLS: "Заклинання рис задати вручну",
  MANUAL_FEAT_RESIST: "Стійкості рис задати вручну",
  MANUAL_CLASS_FEATURE: "Вміння класів налаштувати вручну",
  MANUAL_PREREQUISITE: "Вимоги перевірити вручну",
  MANUAL_OPTIONAL_PROGRESSION: "Прогресію опційних вмінь задати вручну",
  MANUAL_OPTIONAL_FEATURE: "Опційні вміння налаштувати вручну",
  MANUAL_MONSTER_ACTION: "Дії юнітів налаштувати вручну",
  MANUAL_MONSTER_HP: "Здоров'я юнітів перевірити вручну",
  MANUAL_MONSTER_DEFENSE: "Захист юнітів перевірити вручну",
  MANUAL_MULTIATTACK_DETAIL: "Мультиатаки юнітів уточнити вручну",
  MANUAL_ITEM_EFFECT: "Ефекти предметів налаштувати вручну",
  MANUAL_TOOL_CHOICE: "Вибір інструментів задати вручну",
  MANUAL_CUSTOM_SKILL: "Власні навички додати вручну",
  MANUAL_CONDITION_TEXT: "Стани описати вручну",
  MANUAL_ATTACK_RIDER: "Додаткові ефекти атак задати вручну",
  MANUAL_ABILITY_RULE: "Правила здібностей задати вручну",
  MANUAL_ABILITY_VARIANTS: "Варіанти здібностей обрати вручну",
  MANUAL_RACE_MOVEMENT: "Рух рас налаштувати вручну",
  MANUAL_RACE_RESIST: "Стійкості рас задати вручну",
  MANUAL_RACE_SPELLS: "Заклинання рас задати вручну",
  MANUAL_SPELL_ZONE_OR_TRIGGER: "Зони й тригери заклинань налаштувати вручну",
  MANUAL_SPELL_UNSUPPORTED_CONDITION: "Непідтримувані стани заклинань замінити вручну",
  SPELL_NARRATIVE_ONLY: "Заклинання без бойової механіки (ефект описує ДМ)",
  SPELL_RIDER_MANUAL: "Додаткові ефекти заклинань не автоматизовано",
  CHARACTERS_REQUIRED: "Спершу створіть персонажів",
  CLASSES_MODE_REQUIRED: "Увімкніть режим класів 5e",
  UNRESOLVED_REF: "Незіставлені залежності",
  FEATURE_REF_UNRESOLVED: "Незіставлені посилання на вміння",
  BACKGROUND_FEAT_INVALID: "Некоректна риса передісторії",
  BACKGROUND_FEAT_CHOICE: "Риса передісторії — вибір вручну",
  CLASS_HIT_DIE: "Кістку здоров'я класу перевірити",
  UNSUPPORTED_FIELD: "Непідтримувані поля",
  UNSUPPORTED_ENTRY: "Непідтримувані записи",
  UNSUPPORTED_CONDITION: "Непідтримувані умови",
  UNSUPPORTED_TAG: "Непідтримувані теги",
  UNSUPPORTED_COPY: "Непідтримувані копії записів",
  UNSUPPORTED_FEAT_CATEGORY: "Непідтримувана категорія рис",
  NOTES_SIZE: "Примітки завеликі",
};

export const issueCodeLabel = (code: string) => ISSUE_CODE_LABELS[code] ?? code;

export type IssueGroup = { code: string; title: string; severity: ImportIssue["severity"]; action: string; items: Array<{ path: string; action?: string }> };

export function groupIssues(issues: ImportIssue[]): IssueGroup[] {
  const groups = new Map<string, IssueGroup>();

  for (const issue of issues) {
    const group = groups.get(issue.code) ?? { code: issue.code, title: issueCodeLabel(issue.code), severity: issue.severity, action: issue.action, items: [] };

    if (issue.severity === "error") group.severity = "error";

    group.items.push({ path: issue.path, ...(issue.action !== group.action && { action: issue.action }) });
    groups.set(issue.code, group);
  }

  return [...groups.values()].sort((a, b) => Number(b.severity === "error") - Number(a.severity === "error") || b.items.length - a.items.length);
}

type ReportRow = { status: string; issues: ImportIssue[] };

export const rowActionCount = (row: ReportRow) => splitInfoIssues(row.issues).actions.length;

export const REPORT_ROW_FILTERS = { changed: (row: ReportRow) => row.status !== "unchanged" || rowActionCount(row) > 0, manual: (row: ReportRow) => rowActionCount(row) > 0, all: () => true } as const;

export function sourceLabel(source: unknown) {
  if (!isRecord(source)) return String(source);

  const name = String(source.full ?? source.json ?? "Невідоме джерело");

  const authors = Array.isArray(source.authors) ? source.authors.join(", ") : "";

  return [name, source.abbreviation && `(${String(source.abbreviation)})`, authors && `— ${authors}`, source.version && `v${String(source.version)}`, source.dateReleased && String(source.dateReleased), typeof source.url === "string" && source.url].filter(Boolean).join(" ");
}

const metaEditionLabel = (edition: unknown) => edition === "classic" || edition === "one" ? editionLabel(edition) : undefined;

export function metaSummary(meta: unknown): { sources: string[]; edition?: string } {
  const record = isRecord(meta) ? meta : {};

  return { sources: Array.isArray(record.sources) ? record.sources.map(sourceLabel) : [], edition: metaEditionLabel(record.edition) };
}

export function describeRulesPatch(patch: JsonRecord | undefined) {
  if (!patch) return "немає";

  const parts: string[] = [];

  if (isRecord(patch.classes) && typeof patch.classes.enabled === "boolean") parts.push(patch.classes.enabled ? "увімкнути режим класів 5e" : "вимкнути режим класів 5e");

  const custom = isRecord(patch.conditions) && Array.isArray(patch.conditions.custom) ? patch.conditions.custom.length : 0;

  if (custom) parts.push(`власні стани з книги: ${custom}`);

  const other = Object.keys(patch).filter((key) => key !== "classes" && !(key === "conditions" && custom)).length;

  if (other) parts.push(`інших розділів правил: ${other}`);

  return parts.join("; ") || "немає";
}

export function summaryLines(summary: unknown): string[] {
  if (!isRecord(summary)) return [];

  const count = (value: unknown) => Array.isArray(value) ? value.length : 0;

  const originFeat = Array.isArray(summary.originFeat) ? summary.originFeat.map((feat) => isRecord(feat) ? `«${String(feat.name)}»` : "").filter(Boolean).join(", ") : "";

  return [`Вибори: ${count(summary.choices)}`, `Навички: ${count(summary.skills)}; інструменти: ${count(summary.tools)}`, ...(originFeat ? [`Origin feat: ${originFeat}`] : []), "Спорядження й гроші — вручну"];
}

export function splitInfoIssues(issues: ImportIssue[]) {
  const info = issues.filter((i) => COMPENDIUM_INFO_ISSUE_CODES.has(i.code));

  return { actions: issues.filter((i) => !COMPENDIUM_INFO_ISSUE_CODES.has(i.code)), info };
}

export function infoSummary(info: ImportIssue[]) {
  if (!info.length) return "";

  const categories = [...new Set(info.filter((i) => i.code === "UNSUPPORTED_CATEGORY").map((i) => i.path))];

  const media = info.filter((i) => i.code === "MEDIA_OR_FOUNDRY_SKIPPED").length;

  return [categories.length && `Пропущено непідтримувані категорії: ${categories.join(", ")}`, media && `Пропущено медіа/Foundry-полів: ${media}`].filter(Boolean).join(". ");
}
