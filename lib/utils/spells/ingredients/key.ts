export const ingredientKey = (name: string) =>
  name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/^\s*(?:an?|the)\s+/, "")
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "");

export const trackedIngredients = <T extends { focus: boolean }>(list: T[]) => list.filter((i) => !i.focus);

export const itemIngredientKey = (item: { name: string; ingredient?: string }) => ingredientKey(item.ingredient ?? item.name);
