import type { Slug } from "@/content";
import { aegisai } from "./aegisai";
import { assetize } from "./assetize";
import { honora } from "./honora";
import { praman } from "./praman";
import type { DiagramSpec } from "./types";

export const DIAGRAMS: Partial<Record<Slug, DiagramSpec>> = { praman, honora, aegisai, assetize };

export const diagramFor = (slug: Slug): DiagramSpec | null => DIAGRAMS[slug] ?? null;
export { Diagram } from "./Diagram";
export type { DiagramSpec } from "./types";
