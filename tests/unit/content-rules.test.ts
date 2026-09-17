import { describe, expect, it } from "vitest";
import { allStrings, bySlug, copy, flagships, identity, projects } from "@/content";

const BANNED = [
  "—",
  "revolutionary",
  "cutting-edge",
  "cutting edge",
  "seamless",
  "leverage",
  "innovative",
  "game-changing",
];

function violations(obj: unknown, name: string) {
  return allStrings(obj, name).flatMap(({ path, text }) =>
    BANNED.filter((b) => text.toLowerCase().includes(b)).map((b) => `${path}: contains "${b}"`),
  );
}

describe("copy rules", () => {
  it("identity and copy contain no em dashes or banned words", () => {
    expect([...violations(identity, "identity"), ...violations(copy, "copy")]).toEqual([]);
  });
});

describe("projects", () => {
  it("contain no banned copy", () => {
    expect(violations(projects, "projects")).toEqual([]);
  });

  it("every project has a non-empty owned line", () => {
    for (const p of projects) expect(p.owned.trim().length, p.slug).toBeGreaterThan(20);
  });

  it("has exactly four flagships in spec order", () => {
    expect(flagships().map((p) => p.slug)).toEqual(["praman", "honora", "aegisai", "assetize"]);
  });

  it("team projects credit every collaborator", () => {
    expect(bySlug("honora").team?.credits.map((c) => c.name)).toEqual(["Diya", "Abhijith A", "Meghna"]);
    expect(bySlug("aegisai").team?.credits.map((c) => c.name)).toEqual(["Milan", "Mahathi", "Meenakshi"]);
    expect(bySlug("zyra").team?.credits.map((c) => c.name)).toEqual(["Abhijith A"]);
  });

  it("honora carries the verified sepolia address", () => {
    expect(bySlug("honora").onchain?.address).toBe("0xf4e1c0179acC2A54C195e8687621ee070be06B3C");
  });

  it("every flagship publishes limits and proof", () => {
    for (const p of flagships()) {
      expect(p.limits.length, p.slug).toBeGreaterThan(0);
      expect(p.proof.length, p.slug).toBeGreaterThan(0);
    }
  });
});
