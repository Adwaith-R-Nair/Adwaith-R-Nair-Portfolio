import type { Metadata, Viewport } from "next";
import { IBM_Plex_Mono, Instrument_Serif } from "next/font/google";
import type { ReactNode } from "react";
import "@/styles/tokens.css";
import "@/styles/globals.css";

const display = Instrument_Serif({
  weight: "400",
  style: ["normal", "italic"],
  subsets: ["latin"],
  display: "swap",
  variable: "--font-instrument-serif",
  fallback: ["Georgia", "serif"],
});

const mono = IBM_Plex_Mono({
  weight: ["400", "500"],
  subsets: ["latin"],
  display: "swap",
  variable: "--font-plex-mono",
  fallback: ["ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://adwaith-r-nair.vercel.app"),
  title: { default: "Adwaith R Nair", template: "%s · Adwaith R Nair" },
  description:
    "I build systems that have to be trusted. Agentic payments governance, blockchain evidence integrity, AI decision layers and tokenized property records.",
};

export const viewport: Viewport = {
  themeColor: "#0a0810",
  colorScheme: "dark",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${mono.variable}`}>
      <body>
        <a className="skip-link" href="#main">Skip to content</a>
        {children}
      </body>
    </html>
  );
}
