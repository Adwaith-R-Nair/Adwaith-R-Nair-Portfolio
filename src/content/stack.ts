import type { Slug, StackBucket, StackEntry } from "./types";
import { projects } from "./projects";

function usedBy(key: string): Slug[] {
  return projects.filter((p) => p.stack.includes(key)).map((p) => p.slug);
}

const entry = (key: string, name: string, bucket: StackBucket): StackEntry => ({
  key,
  name,
  bucket,
  projects: usedBy(key),
});

export const stack: StackEntry[] = [
  // Built with: owned the code that used it.
  entry("typescript", "TypeScript", "built"),
  entry("nodejs", "Node.js", "built"),
  entry("bun", "Bun", "built"),
  entry("nextjs", "Next.js", "built"),
  entry("express", "Express", "built"),
  entry("postgresql", "PostgreSQL", "built"),
  entry("prisma", "Prisma", "built"),
  entry("supabase", "Supabase", "built"),
  entry("mongodb", "MongoDB", "built"),
  entry("solidity", "Solidity", "built"),
  entry("hardhat", "Hardhat", "built"),
  entry("ethersjs", "ethers.js", "built"),
  entry("ipfs", "IPFS", "built"),
  entry("ed25519", "Ed25519 signatures", "built"),
  entry("python", "Python", "built"),
  entry("fastapi", "FastAPI", "built"),
  entry("esp-idf", "ESP-IDF (C)", "built"),
  entry("zod", "Zod", "built"),
  entry("tailwind", "Tailwind", "built"),
  entry("github-actions", "GitHub Actions", "built"),
  entry("vercel", "Vercel", "built"),
  entry("prompt-design", "Prompt design", "built"),
  // Worked with: integrated or operated, did not own the internals.
  entry("watsonx", "watsonx.ai", "worked"),
  entry("razorpay", "Razorpay API", "worked"),
  entry("anthropic-api", "Anthropic API", "worked"),
  entry("gemini-api", "Gemini API", "worked"),
  entry("openai-api", "OpenAI API", "worked"),
  entry("polygon", "Polygon Amoy", "worked"),
  entry("ollama", "Ollama", "worked"),
  entry("faster-whisper", "Faster-Whisper", "worked"),
  entry("kokoro", "Kokoro TTS", "worked"),
  entry("home-assistant", "Home Assistant", "worked"),
  entry("shadcn", "shadcn/ui", "worked"),
  entry("framer-motion", "Framer Motion", "worked"),
  entry("react-pdf", "@react-pdf/renderer", "worked"),
  entry("recharts", "Recharts", "worked"),
  // Exploring: approved by Adwaith, edit freely.
  entry("rust", "Rust", "exploring"),
  entry("solana", "Solana", "exploring"),
  entry("zk", "Zero-knowledge proofs", "exploring"),
  entry("tee", "Trusted execution and attestation", "exploring"),
];

export const stackByBucket = (bucket: StackBucket): StackEntry[] =>
  stack.filter((s) => s.bucket === bucket);

export const stackFor = (slug: Slug): StackEntry[] =>
  stack.filter((s) => s.projects.includes(slug));
