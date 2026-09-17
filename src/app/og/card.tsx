import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { ReactElement } from "react";

/* Palette as hex: ImageResponse cannot read CSS custom properties. */
const GROUND = "#0a0810";
const INK = "#ede7f0";
const MUTED = "#8e8ea9";
const ACCENT = "#d3b2a0";
const HAIRLINE = "rgba(142, 142, 169, 0.35)";

const dir = join(process.cwd(), "src/app/og");

export const SIZE = { width: 1200, height: 630 };

export async function loadFonts() {
  const [serif, serifItalic, mono] = await Promise.all([
    readFile(join(dir, "fonts/InstrumentSerif-Regular.ttf")),
    readFile(join(dir, "fonts/InstrumentSerif-Italic.ttf")),
    readFile(join(dir, "fonts/IBMPlexMono-Regular.ttf")),
  ]);
  return [
    { name: "Instrument Serif", data: serif, style: "normal" as const, weight: 400 as const },
    { name: "Instrument Serif", data: serifItalic, style: "italic" as const, weight: 400 as const },
    { name: "IBM Plex Mono", data: mono, style: "normal" as const, weight: 400 as const },
  ];
}

export async function portraitDataUrl(): Promise<string> {
  const png = await readFile(join(dir, "portrait.png"));
  return `data:image/png;base64,${png.toString("base64")}`;
}

export interface CardProps {
  portrait: string;
  eyebrow: string;
  /** First line of the title, upright. */
  title: string;
  /** Optional second line, italic in the accent. */
  titleEm?: string;
  /** Font size of the italic line. Defaults to the title size. */
  emSize?: number;
  body: string;
  footLeft: string;
  footRight: string;
}

/** The 1200 by 630 frame shared by every card: portrait on the left, type on the right. */
export function Card(p: CardProps): ReactElement {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        background: GROUND,
        color: INK,
        fontFamily: "IBM Plex Mono",
      }}
    >
      <div style={{ position: "relative", width: 470, height: 630, display: "flex", overflow: "hidden" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={p.portrait} width={517} height={630} alt="" style={{ position: "absolute", left: -30, top: 0 }} />
        <div
          style={{
            position: "absolute",
            top: 0, left: 0, width: 470, height: 630,
            background: `linear-gradient(to right, rgba(10,8,16,0) 50%, ${GROUND} 100%)`,
          }}
        />
        <div
          style={{
            position: "absolute",
            top: 0, left: 0, width: 470, height: 630,
            background: `linear-gradient(to top, ${GROUND} 0%, rgba(10,8,16,0) 40%)`,
          }}
        />
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          width: 730,
          padding: "0 72px 0 0",
          gap: 22,
        }}
      >
        <div style={{ fontSize: 15, letterSpacing: "0.28em", textTransform: "uppercase", color: ACCENT }}>
          {p.eyebrow}
        </div>
        <div style={{ display: "flex", flexDirection: "column", fontFamily: "Instrument Serif", fontSize: 66, lineHeight: 1.04 }}>
          <div style={{ display: "flex" }}>{p.title}</div>
          {p.titleEm ? (
            <div style={{ display: "flex", fontStyle: "italic", color: ACCENT, fontSize: p.emSize ?? 66, lineHeight: 1.1 }}>
              {p.titleEm}
            </div>
          ) : null}
        </div>
        <div style={{ fontSize: 20, lineHeight: 1.5, color: MUTED, maxWidth: 640 }}>{p.body}</div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginTop: 14,
            paddingTop: 18,
            borderTop: `1px solid ${HAIRLINE}`,
            fontSize: 14,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: MUTED,
          }}
        >
          <div style={{ display: "flex" }}>{p.footLeft}</div>
          <div style={{ display: "flex", color: ACCENT }}>{p.footRight}</div>
        </div>
      </div>
    </div>
  );
}
