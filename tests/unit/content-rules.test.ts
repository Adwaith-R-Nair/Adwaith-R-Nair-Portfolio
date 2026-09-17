import { describe, expect, it } from "vitest";
import { allStrings, copy, identity } from "@/content";

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
