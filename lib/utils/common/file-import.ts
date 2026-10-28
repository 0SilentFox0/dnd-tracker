/**
 * Парсить JSON файл в масив об'єктів
 */
export async function parseJSONFile<T>(file: File): Promise<T[]> {
  const text = await file.text();

  const data = JSON.parse(text) as T | T[];

  return Array.isArray(data) ? data : [data];
}
