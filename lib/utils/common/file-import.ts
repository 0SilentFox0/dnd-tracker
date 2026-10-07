import type { CSVRow } from "@/types/import";

/**
 * Парсить CSV рядок з підтримкою лапок та різних роздільників
 */
export function parseCSVLine(
  line: string,
  delimiter: string | RegExp = /[,;]/
): string[] {
  const result: string[] = [];

  let current = "";

  let inQuotes = false;

  if (delimiter instanceof RegExp) {
    for (let i = 0; i < line.length; i++) {
      const char = line[i];

      const nextChar = i < line.length - 1 ? line[i + 1] : null;

      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          current += '"';
          i++; // Пропускаємо наступну лапку
        } else {
          inQuotes = !inQuotes;
        }
      } else if (!inQuotes) {
        const remaining = line.substring(i);

        const match = remaining.match(delimiter);

        if (match && match.index === 0) {
          result.push(current.trim());
          current = "";
          i += match[0].length - 1; // Переміщуємося на довжину delimiter
          continue;
        }
      }

      current += char;
    }
  } else {
    for (let i = 0; i < line.length; i++) {
      const char = line[i];

      const nextChar = i < line.length - 1 ? line[i + 1] : null;

      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          current += '"';
          i++; // Пропускаємо наступну лапку
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === delimiter && !inQuotes) {
        result.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }
  }

  result.push(current.trim());

  return result;
}

/**
 * Парсить CSV файл в масив об'єктів
 */
export async function parseCSVFile<T extends CSVRow>(
  file: File,
  delimiter: string | RegExp = /[,;]/
): Promise<T[]> {
  const text = await file.text();

  const lines = text.split("\n").filter((line) => line.trim());
  
  if (lines.length === 0) {
    throw new Error("CSV файл порожній");
  }

  const headers = parseCSVLine(lines[0], delimiter);

  const rows: T[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i], delimiter);

    if (values.length > headers.length) {
      const lastIndex = headers.length - 1;

      const extraValues = values.slice(lastIndex);

      values.splice(
        lastIndex,
        values.length - lastIndex,
        extraValues.join(", ")
      );
    }

    if (values.length < headers.length) {
      while (values.length < headers.length) {
        values.push("");
      }
    }

    const row: Record<string, string> = {};

    headers.forEach((header, index) => {
      let value = values[index] || "";

      if (value.startsWith('"') && value.endsWith('"')) {
        value = value.slice(1, -1);
      }

      row[header] = value;
    });
    rows.push(row as T);
  }

  return rows;
}

/**
 * Парсить JSON файл в масив об'єктів
 */
export async function parseJSONFile<T>(file: File): Promise<T[]> {
  const text = await file.text();

  const data = JSON.parse(text) as T | T[];

  return Array.isArray(data) ? data : [data];
}
