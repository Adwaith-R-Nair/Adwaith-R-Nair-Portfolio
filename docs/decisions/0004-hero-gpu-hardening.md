# 0004: Harden the hero layer after it crashed a desktop session

**Date:** 2026-09-19
**Status:** accepted

## Incident

On 2026-09-19 at 22:32, the live site's particle hero, running in Chrome 153 on an ASUS TUF A15
(AMD Radeon 680M integrated GPU, Mesa 26.0.3, kernel 7.0.0-31, GNOME 50 on Wayland), triggered
an amdgpu page fault attributed to Chrome's GPU process, followed by a GPU ring reset. The reset
cost GNOME Shell its GPU context; on Wayland the shell is the display server and cannot survive
that, so it aborted (SIGABRT) and the user was returned to the login screen. Crash reports:
`/var/crash/_usr_bin_gnome-shell.1000.crash`, `_opt_google_chrome_chrome.1000.crash`. The owner
reports the same on the first load of earlier sessions.

Just before the fault the page measured about 2 frames per second, at tier "high" (170,000
points, DPR 2). The stepper never reacted: it ignored every frame over 80 ms as a "stall", so a
device at 2 fps was invisible to it.

## Diagnosis

A web page should not be able to fault a GPU; the root defect is in the graphics driver stack,
and GNOME's inability to survive a reset turns it into a logout. The site cannot fix either. It
can stop being the heaviest thing on the GPU, stop hiding its own slowness, and never do it to
the same visitor twice.

## Decision

1. **One context.** The layer creates exactly one WebGL2 context, reads the GPU name from it,
   and hands that same context to three.js. The earlier throwaway probe context is gone.
2. **Default power preference**, and `failIfMajorPerformanceCaveat` so the browser refuses
   instead of falling back to software.
3. **Weak devices never get a context.** Memory, core and Data Saver checks run first.
4. **Integrated GPUs start at "balanced"** (95,000 points) and may step up to the device's
   ceiling only after 6 s of measurement with two consecutive windows showing real headroom
   (median frame tick at or under 9 ms, which only a fast display that is keeping up can show).
   Discrete GPUs, recognised by name, start at their ceiling. Geometry is allocated once for the
   ceiling, so a step up is a draw-range change. The visual difference between 95,000 and
   170,000 points was measured as negligible (same brightness and coverage).
5. **The stepper sees every frame.** The 80 ms filter is removed. Ten consecutive frames over
   200 ms switch the layer off at once, even during warm-up.
6. **Frame pacing.** Drawing is capped at 60 fps, and at 30 fps after 2 s without scroll or
   pointer movement. The browser still ticks at display rate; only draws are skipped.
7. **Crash memory.** A dead-man's switch in `localStorage` (`hero:v1`): set while the layer is
   in a visible tab, cleared when the tab is hidden, closed normally, or the layer stops. A
   visit that finds it still set knows the previous one died while drawing, and keeps the layer
   off for 7 days. A lost WebGL context does the same. `?hero=reset` clears it.
8. **Guards.** Point size is clamped to 32 px and non-finite sizes are dropped in the shader;
   zero-size windows are never drawn or resized into.

## Consequences

- On the owner's laptop the portrait starts at 95,000 points at 60 fps instead of 170,000 at
  144 fps, roughly a quarter of the previous GPU work until it earns the step up.
- A visitor whose browser dies while the layer is drawing, for any reason, sees the static
  portrait for a week. That false positive is accepted: a portfolio must never crash a desktop
  twice.
- These measures lower the odds of hitting a driver bug; they cannot guarantee it. Item 7 is
  the guarantee against repeats.
