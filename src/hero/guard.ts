/**
 * Crash memory for the particle layer, kept in the visitor's own browser.
 *
 * A GPU fault can take the whole browser down with it, so no "context lost" event is guaranteed
 * to fire. This is a dead-man's switch instead: `pending` is set while the layer is drawing in a
 * visible tab and cleared when the tab is hidden or closed normally. If a visit starts and finds
 * `pending` still set, the previous visit died while drawing, and the layer stays off for a week.
 * A lost WebGL context, which the page does see, disables it the same way.
 *
 * Every storage access is wrapped: private windows and blocked storage simply mean no memory.
 */

export const KEY = "hero:v1";
export const DISABLE_MS = 7 * 24 * 60 * 60 * 1000;

export interface GuardStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

interface State {
  /** Epoch ms until which the layer stays off. */
  disabledUntil?: number;
  /** Epoch ms at which drawing began in a visible tab. Present means "not yet safely ended". */
  pending?: number;
}

function read(store: GuardStore | null): State {
  if (!store) return {};
  try {
    const raw = store.getItem(KEY);
    const v: unknown = raw ? JSON.parse(raw) : {};
    return v && typeof v === "object" ? (v as State) : {};
  } catch {
    return {};
  }
}

function write(store: GuardStore | null, s: State): void {
  if (!store) return;
  try {
    if (s.disabledUntil === undefined && s.pending === undefined) store.removeItem(KEY);
    else store.setItem(KEY, JSON.stringify(s));
  } catch {
    /* storage unavailable: no memory, no harm */
  }
}

/** The browser's localStorage, or null when it is unavailable or throws. */
export function browserStore(): GuardStore | null {
  try {
    const s = window.localStorage;
    const probe = `${KEY}:probe`;
    s.setItem(probe, "1");
    s.removeItem(probe);
    return s;
  } catch {
    return null;
  }
}

/**
 * True when the layer must not start. A leftover `pending` from a previous visit converts into a
 * week-long disable here, so the decision survives this visit too.
 */
export function shouldSkip(store: GuardStore | null, now: number): boolean {
  const s = read(store);
  if (s.pending !== undefined) {
    write(store, { disabledUntil: now + DISABLE_MS });
    return true;
  }
  if (s.disabledUntil !== undefined) {
    if (s.disabledUntil > now) return true;
    write(store, {});
  }
  return false;
}

/** Drawing in a visible tab. */
export function markPending(store: GuardStore | null, now: number): void {
  const s = read(store);
  write(store, { ...s, pending: now });
}

/** The tab was hidden or closed normally, or the layer stopped on its own terms. */
export function clearPending(store: GuardStore | null): void {
  const s = read(store);
  if (s.pending === undefined) return;
  write(store, { disabledUntil: s.disabledUntil });
}

/** The WebGL context was lost: keep the layer off for a week. */
export function markLost(store: GuardStore | null, now: number): void {
  write(store, { disabledUntil: now + DISABLE_MS });
}

/** Manual override, used by `?hero=reset`. */
export function resetGuard(store: GuardStore | null): void {
  write(store, {});
}
