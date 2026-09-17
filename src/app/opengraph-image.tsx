import { ImageResponse } from "next/og";
import { Card, SIZE, loadFonts, portraitDataUrl } from "./og/card";
import { identity } from "@/content";

export const alt = "Adwaith R Nair. I build systems that have to be trusted.";
export const size = SIZE;
export const contentType = "image/png";

export default async function Image() {
  const [fonts, portrait] = await Promise.all([loadFonts(), portraitDataUrl()]);
  return new ImageResponse(
    <Card
      portrait={portrait}
      eyebrow={`${identity.name}, Kochi`}
      title="I build systems that"
      titleEm="have to be trusted."
      body="Praman governs autonomous agents spending real money. Honora proves legal evidence was never altered. AegisAI decides when an AI may act alone. Assetize makes property records verifiable."
      footLeft="Blockchain and GenAI engineer"
      footRight="Praman, Honora, AegisAI, Assetize"
    />,
    { ...size, fonts },
  );
}
