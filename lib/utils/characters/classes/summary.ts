const SUMMARY_MAX = 120;

export const summarize = (text?: string): string => {
  const line = (text ?? "").split("\n").map((l) => l.trim()).find(Boolean) ?? "";

  if (line.length <= SUMMARY_MAX) return line;

  const cut = line.slice(0, SUMMARY_MAX);

  const space = cut.lastIndexOf(" ");

  return `${(space > 0 ? cut.slice(0, space) : cut).trimEnd()}…`;
};
