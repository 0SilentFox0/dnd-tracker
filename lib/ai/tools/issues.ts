const MAX_ISSUE_LINES = 20;

function issueLine(issue: unknown): string {
  if (typeof issue !== "object" || issue === null) return `- (root): ${String(issue)}`;

  const { path, message, ...rest } = issue as { path?: unknown; message?: unknown } & Record<string, unknown>;

  const where = Array.isArray(path) ? path.join(".") : "";

  const text = typeof message === "string" ? message : Object.entries(rest).map(([k, v]) => `${k}=${typeof v === "string" ? v : JSON.stringify(v)}`).join(", ");

  return `- ${where || "(root)"}: ${text}`;
}

export function formatIssues(issues: readonly unknown[]): string[] {
  const lines = issues.slice(0, MAX_ISSUE_LINES).map(issueLine);

  const more = issues.length - lines.length;

  return more > 0 ? [...lines, `- …and ${more}`] : lines;
}
