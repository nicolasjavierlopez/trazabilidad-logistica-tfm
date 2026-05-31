export const HIDDEN_KEYS = new Set(["imgUrl", "factorConversion"]);

/** Converts camelCase to "Sentence case with spaces". e.g. unidadMedida → Unidad medida */
export function formatAttrKey(key: string): string {
  const spaced = key.replace(/([A-Z])/g, " $1").trim();
  const lower = spaced.toLowerCase();
  return lower.charAt(0).toUpperCase() + lower.slice(1);
}

export function visibleAttrs(features: Record<string, unknown>): [string, unknown][] {
  return Object.entries(features).filter(([k]) => !HIDDEN_KEYS.has(k) && !k.toLowerCase().includes("parent"));
}
