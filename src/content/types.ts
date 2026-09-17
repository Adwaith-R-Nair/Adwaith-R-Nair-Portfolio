export type Status = "live" | "testnet" | "prototype" | "demo";

export type Slug = "praman" | "honora" | "aegisai" | "assetize" | "nexus" | "zyra";

export interface Credit {
  name: string;
  owned: string;
}

export interface Labelled {
  label: string;
  value: string;
}

export interface Titled {
  title: string;
  body: string;
}

export interface Project {
  slug: Slug;
  name: string;
  tagline: string;
  status: Status;
  flagship: boolean;
  /** The binding "what I owned" line. Never empty. */
  owned: string;
  team?: { size: number; credits: Credit[] };
  repo: string;
  context: string;
  period: string;
  /** One concrete sentence for the home page list. */
  summary: string;
  /** One measured fact for the home page list. */
  headline: Labelled;
  problem: string;
  architecture: string[];
  decisions: Titled[];
  proof: Labelled[];
  bugs?: Titled[];
  limits: string[];
  scale?: Labelled[];
  /** Keys into stack.ts. */
  stack: string[];
  onchain?: { network: string; address: string; explorer: string };
}

export interface Edge {
  from: Slug;
  to: Slug;
  concern: string;
}

export type StackBucket = "built" | "worked" | "exploring";

export interface StackEntry {
  key: string;
  name: string;
  bucket: StackBucket;
  projects: Slug[];
}
