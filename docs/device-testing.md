# Testing on a real device

Simulated numbers are guesses. The build spec's budget is written for real hardware on a real network, so the last check is done by hand on a phone. This is the whole procedure; it takes about ten minutes.

## What to open

| Purpose | URL |
|---|---|
| Normal visit | `https://adwaith-r-nair-portfolio.vercel.app/` |
| With the readout | `https://adwaith-r-nair-portfolio.vercel.app/?hero=debug` |
| After a crash, to re-enable the particles | `https://adwaith-r-nair-portfolio.vercel.app/?hero=reset` |

`?hero=debug` puts a small panel in the bottom-left corner:

```
tier balanced  95k points  dpr 3
57 fps drawn of 60 offered  cap 60
Qualcomm, Adreno (TM) 618, OpenGL ES 3.2
```

- **tier** and **points**: the quality level the layer settled on. It may start at `balanced` and move to `high` after about six seconds if the phone has headroom.
- **fps drawn** against **offered**: drawn is how often the portrait was redrawn. Offered is the phone's own screen rate. **cap** is what the layer is aiming for: 60 normally, 30 after a couple of seconds without scrolling, when the line also reads `idle`. Drawn well below the cap, with no `idle`, means the GPU is struggling. That is the number to report.
- **dpr**: the screen's pixel density.

## The run

Use mobile data, not Wi-Fi, so the network is realistic. Close other apps first.

1. **Cold load.** Open the normal URL. Time roughly how long until your face is readable. The budget is under 2 seconds.
2. **Does the portrait resolve?** The photo should turn into particles about a second in, and the face should stay recognisable, not mushy.
3. **Scroll slowly** from top to bottom. Watch for stutter in the four states: portrait, name, constellation, contact line.
4. **Open the debug URL** and note the three lines after about ten seconds, once the tier has settled.
5. **Scroll with the readout open** and note the lowest frame rate you see. The budget is 45 or better.
6. **Tap test:** tap a node in the constellation, tap a project name, tap the résumé link. Each should hit first time, no pinching needed.
7. **Read test:** hold the phone at normal distance. The small uppercase labels should be legible.
8. **Reduced motion:** turn on Settings, Accessibility, Remove animations, reload the page. The portrait should still appear, but nothing should drift or morph smoothly. Turn it back off afterwards.
9. **Rotate** to landscape and back. Nothing should overflow sideways or overlap.

## What to report back

Copy the three readout lines, plus:

- Phone model and browser.
- Roughly how long the cold load took.
- Lowest frame rate seen while scrolling.
- Anything that stuttered, overlapped, was hard to tap, or looked wrong.
- Whether the session survived, with no crash or logout.

Those numbers go into the budget table in [design.md](./design.md) section 8, measured rather than simulated.

## If the particles do not appear

That is by design in several cases:

- The phone reports 2 GB of memory or fewer, or two cores or fewer.
- Data Saver is on.
- The browser falls back to software rendering.
- A previous visit ended while the layer was drawing, for example a browser crash. The layer then stays off for seven days, and `?hero=reset` clears that.

The page is complete either way: the static photo is the hero, and every word is in the HTML.
