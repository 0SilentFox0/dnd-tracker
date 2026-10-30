export const ingredientKey = (name: string) =>
  name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "");

export const trackedIngredients = <T extends { focus: boolean }>(list: T[]) => list.filter((i) => !i.focus);
