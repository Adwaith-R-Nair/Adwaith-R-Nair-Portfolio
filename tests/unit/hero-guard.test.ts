import { describe, expect, it } from "vitest";
import {
  DISABLE_MS, KEY, clearPending, markLost, markPending, resetGuard, shouldSkip, type GuardStore,
} from "@/hero/guard";
import { debugRequested, heroFlags } from "@/hero/debug";

function memoryStore(): GuardStore & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return {
    data,
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => void data.set(k, v),
    removeItem: (k) => void data.delete(k),
  };
}

const T = 1_800_000_000_000;

describe("hero crash guard", () => {
  it("allows a first visit and leaves nothing behind", () => {
    const s = memoryStore();
    expect(shouldSkip(s, T)).toBe(false);
    expect(s.data.size).toBe(0);
  });

  it("a normal close clears the sentinel, so the next visit draws", () => {
    const s = memoryStore();
    markPending(s, T);
    clearPending(s);
    expect(shouldSkip(s, T + 1000)).toBe(false);
  });

  it("a visit that died while drawing disables the layer for a week", () => {
    const s = memoryStore();
    markPending(s, T);
    // The browser crashed: no clearPending. Next visit:
    expect(shouldSkip(s, T + 60_000)).toBe(true);
    // Still off a day later, even though the sentinel was consumed.
    expect(shouldSkip(s, T + 60_000 + 24 * 3600_000)).toBe(true);
    // Back on after the week.
    expect(shouldSkip(s, T + 60_000 + DISABLE_MS + 1)).toBe(false);
    expect(s.data.has(KEY)).toBe(false);
  });

  it("a lost context disables the layer for a week", () => {
    const s = memoryStore();
    markLost(s, T);
    expect(shouldSkip(s, T + 1)).toBe(true);
    expect(shouldSkip(s, T + DISABLE_MS + 1)).toBe(false);
  });

  it("reset clears everything", () => {
    const s = memoryStore();
    markLost(s, T);
    resetGuard(s);
    expect(shouldSkip(s, T + 1)).toBe(false);
  });

  it("survives corrupt or missing storage", () => {
    const s = memoryStore();
    s.data.set(KEY, "{not json");
    expect(shouldSkip(s, T)).toBe(false);
    expect(shouldSkip(null, T)).toBe(false);
    expect(() => markPending(null, T)).not.toThrow();
    const throwing: GuardStore = {
      getItem: () => { throw new Error("blocked"); },
      setItem: () => { throw new Error("blocked"); },
      removeItem: () => { throw new Error("blocked"); },
    };
    expect(shouldSkip(throwing, T)).toBe(false);
    expect(() => markPending(throwing, T)).not.toThrow();
  });
});

describe("hero url flags", () => {
  it("reads one flag or several", () => {
    expect([...heroFlags("?hero=debug")]).toEqual(["debug"]);
    expect([...heroFlags("?hero=reset,debug")]).toEqual(["reset", "debug"]);
    expect([...heroFlags("?hero=")]).toEqual([]);
    expect([...heroFlags("")]).toEqual([]);
  });

  it("asks for the readout only when told to", () => {
    expect(debugRequested("?hero=debug")).toBe(true);
    expect(debugRequested("?hero=reset,debug")).toBe(true);
    expect(debugRequested("?hero=reset")).toBe(false);
    expect(debugRequested("")).toBe(false);
  });
});
