import { ImageResponse } from "next/og";
import { Card, SIZE, loadFonts, portraitDataUrl } from "@/app/og/card";
import { flagships, type Slug } from "@/content";

export const alt = "Case study by Adwaith R Nair";
export const size = SIZE;
export const contentType = "image/png";

export function generateStaticParams() {
  return flagships().map((p) => ({ slug: p.slug }));
}

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const p = flagships().find((x) => x.slug === (slug as Slug)) ?? flagships()[0]!;
  const [fonts, portrait] = await Promise.all([loadFonts(), portraitDataUrl()]);
  return new ImageResponse(
    <Card
      portrait={portrait}
      eyebrow={p.context}
      title={p.name}
      titleEm={p.tagline}
      emSize={40}
      body={p.summary}
      footLeft={p.headline.label}
      footRight={p.headline.value}
    />,
    { ...size, fonts },
  );
}
