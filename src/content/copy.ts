export const copy = {
  hero: {
    eyebrow: "Kochi, Kerala",
    line: "Blockchain and GenAI engineer. B.Tech CS and AI, MITS Kochi, class of 2027.",
  },
  thesis: {
    heading: ["I build systems that ", "have to be trusted", "."],
    body:
      "Four systems, one question: how do you prove a machine did the right thing? Praman governs autonomous agents spending real money. Honora proves legal evidence was never altered. AegisAI decides when an AI may act alone and when a human must sign off. Assetize makes property ownership records independently verifiable.",
  },
  graph: {
    eyebrow: "Selected work",
    heading: "Six systems, one question.",
    body: "Every edge is a concern two projects genuinely share, in the code, not in the copy.",
  },
  cases: { title: "Case studies" },
  also: { title: "Also built" },
  oss: { title: "Open source" },
  stack: {
    title: "Stack",
    body: "Hover or focus a technology to see where it was used. Hover a project to see what it was built with.",
    buckets: { built: "Built with", worked: "Worked with", exploring: "Exploring" },
  },
  how: {
    title: "How I build",
    paragraphs: [
      "I direct AI agents the way I would run a small team. I write the spec, decide the architecture and the boundaries, and hand out single-purpose tasks. Praman has 142 commits that each do one thing because each one was one task.",
      "Decisions are written down before code. Praman carries a 24-entry decision log and Assetize about 3,900 lines of documentation, so anyone, including a model with no memory of yesterday, can pick up the reasoning and not just the code.",
      "Nothing consequential runs unchecked. Nexus asks before every file write and shell command. Praman's authorization path has no model in it at all. The same rule applies to how I work: agents propose, tests and I verify, and I own what ships.",
      "Verification is measured, not asserted. Held-out test splits, ablation runs, a self-audit that caught three real boundary violations in Assetize, and a logged bug list. If a number is not on this site, it is because I did not measure it.",
    ],
  },
  contact: {
    title: "Contact",
    heading: ["Say ", "hello", "."],
    body: "Graduating 2027. Reachable now, for AI and agentic engineering, blockchain and backend work.",
  },
} as const;
