type Issue = { code: string; minimum?: unknown; origin?: string; format?: string };

const MEASURED = new Set(["number", "bigint", "date"]);

function zodIssueKey(issue: Issue): string {
  const measured = MEASURED.has(issue.origin ?? "");

  switch (issue.code) {
    case "too_small":
      if (measured) return "validation.min";

      return issue.minimum === 1 ? "validation.required" : "validation.minLength";
    case "too_big":
      return measured ? "validation.max" : "validation.maxLength";
    case "invalid_format":
      return issue.format === "email" ? "validation.email" : "validation.invalid";
    default:
      return "validation.invalid";
  }
}

export function zodErrorMap(issue: Issue): { message: string } {
  return { message: zodIssueKey(issue) };
}
