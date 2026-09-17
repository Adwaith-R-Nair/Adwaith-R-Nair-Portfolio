import type { ReactElement } from "react";

const GROUND = "#0a0810";
const ACCENT = "#d3b2a0";
const GOLD = "#c9a227";

/**
 * The ARN mark. A large serif "A" carries the icon at every size; from 96px up,
 * "RN" sits in the lower right in gold mono like a signature. At favicon size only the A reads.
 */
export function Mark({ px }: { px: number }): ReactElement {
  const showRn = px >= 96;
  // Small sizes have no signature, so the A fills the square.
  const scale = showRn ? 1.02 : 1.22;
  return (
    <div style={{ width: "100%", height: "100%", display: "flex", position: "relative", background: GROUND }}>
      <div
        style={{
          position: "absolute",
          left: showRn ? px * 0.09 : px * 0.1,
          top: showRn ? px * -0.05 : px * -0.14,
          display: "flex",
          fontFamily: "Instrument Serif",
          fontSize: px * scale,
          lineHeight: 1,
          color: ACCENT,
        }}
      >
        A
      </div>
      {showRn ? (
        <div
          style={{
            position: "absolute",
            right: px * 0.1,
            bottom: px * 0.09,
            display: "flex",
            fontFamily: "IBM Plex Mono",
            fontSize: px * 0.16,
            letterSpacing: px * 0.03,
            color: GOLD,
          }}
        >
          RN
        </div>
      ) : null}
    </div>
  );
}
