/**
 * Завантаження та парсинг SKILLS.md для import-skills-library
 */

import * as fs from "fs";
import * as path from "path";

import type { LibrarySkill, SkillsDoc } from "./import-skills-library-types";

export function stripJsonComments(raw: string): string {
  return raw
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\s*\/\/[^\n]*/g, "");
}

export function loadSkillsFromDoc(docPath: string): LibrarySkill[] {
  const fullPath = path.isAbsolute(docPath)
    ? docPath
    : path.join(process.cwd(), docPath);

  const raw = fs.readFileSync(fullPath, "utf-8");

  const jsonStart = raw.indexOf("{");

  if (jsonStart === -1) throw new Error("No JSON object in file");

  let depth = 0;

  let end = jsonStart;

  for (let i = jsonStart; i < raw.length; i++) {
    if (raw[i] === "{") depth++;
    else if (raw[i] === "}") {
      depth--;

      if (depth === 0) {
        end = i + 1;
        break;
      }
    }
  }

  const jsonOnly = raw.slice(jsonStart, end);

  const jsonStr = stripJsonComments(jsonOnly);

  const data = JSON.parse(jsonStr) as SkillsDoc;

  if (!Array.isArray(data.skills)) {
    throw new Error("Invalid SKILLS.md: missing or invalid skills array");
  }

  return data.skills;
}
