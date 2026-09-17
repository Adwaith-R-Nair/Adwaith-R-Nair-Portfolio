export * from "./types";
export { identity } from "./identity";
export { copy } from "./copy";

/** Every string in a content object, depth first. Used by the copy-rule test. */
export function allStrings(value: unknown, path = "root"): { path: string; text: string }[] {
  if (typeof value === "string") return [{ path, text: value }];
  if (Array.isArray(value)) return value.flatMap((v, i) => allStrings(v, `${path}[${i}]`));
  if (value && typeof value === "object") {
    return Object.entries(value).flatMap(([k, v]) => allStrings(v, `${path}.${k}`));
  }
  return [];
}

export { projects, flagships, bySlug } from "./projects";
