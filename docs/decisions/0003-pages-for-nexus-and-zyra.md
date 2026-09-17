# 0003: Nexus and Zyra get /work pages

**Date:** 2026-09-17
**Status:** accepted

## Context

The build spec (section 4) lists Nexus and Zyra under "Also built" as a static grid with no
dedicated page. Adwaith asked for social cards for both. A card is the `og:image` of a page on
this site, so it needs a page to belong to; links to GitHub get GitHub's preview.

## Decision

`/work/[slug]` is generated for all six projects. The case-study component already hides the
sections a project lacks (no diagram, no decisions, no bugs, no scale), so Nexus and Zyra render
as shorter case studies. Every project card is generated from the same template. The home page
is unchanged: the two stay in "Also built" and out of the case-study list, and the graph and
"Also built" names now link to the pages, where the repository link lives.

## Consequences

- Sharing a Nexus or Zyra link shows a card with its context, name, tagline, summary and
  headline figure.
- Neighbour navigation cycles through all six in spec order.
- The flagship list on the home page is still four. `flagships()` is unchanged.
