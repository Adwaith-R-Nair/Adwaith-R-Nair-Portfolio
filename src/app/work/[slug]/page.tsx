import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CaseStudy } from "@/components/work/CaseStudy";
import { projects, type Slug } from "@/content";

type Params = { slug: string };

export const dynamicParams = false;

export function generateStaticParams(): Params[] {
  return projects.map((p) => ({ slug: p.slug }));
}

function find(slug: string) {
  return projects.find((p) => p.slug === (slug as Slug));
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { slug } = await params;
  const p = find(slug);
  if (!p) return {};
  const url = `/work/${p.slug}`;
  return {
    title: p.name,
    description: p.summary,
    alternates: { canonical: url },
    openGraph: { type: "article", url, title: `${p.name}, ${p.tagline}`, description: p.summary },
    twitter: { card: "summary_large_image", title: `${p.name}, ${p.tagline}`, description: p.summary },
  };
}

export default async function WorkPage({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  const p = find(slug);
  if (!p) notFound();
  return (
    <main id="main">
      <CaseStudy project={p} />
    </main>
  );
}
