type Issue = { code: string; minimum?: unknown; origin?: string; format?: string };

function zodIssueKey(issue: Issue): string | undefined {
  switch (issue.code) {
    case "too_small":
      return issue.minimum === 1 && issue.origin !== "number" ? "validation.required" : "validation.minLength";
    case "too_big":
      return "validation.maxLength";
    case "invalid_format":
      return issue.format === "email" ? "validation.email" : "validation.invalid";
    case "invalid_type":
      return "validation.invalid";
    default:
      return undefined;
  }
}

export function zodErrorMap(issue: Issue): { message: string } | undefined {
  const key = zodIssueKey(issue);

  return key ? { message: key } : undefined;
}
