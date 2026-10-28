/* eslint-disable no-restricted-syntax -- client forms still read the Ukrainian localeError until their domains move to translateIssue */
import { z } from "zod";
import uk from "zod/v4/locales/uk.js";

const base = uk().localeError;

z.config({
  localeError: (issue) => {
    if (issue.origin === "string" && issue.code === "too_small") {
      return Number(issue.minimum) <= 1 ? "Обов'язкове поле" : `Щонайменше ${issue.minimum} символів`;
    }

    if (issue.origin === "string" && issue.code === "too_big") return `Не більше ${issue.maximum} символів`;

    return base(issue);
  },
});
