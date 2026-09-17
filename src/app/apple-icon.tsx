import { ImageResponse } from "next/og";
import { loadFonts } from "./og/card";
import { Mark } from "./og/mark";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default async function AppleIcon() {
  return new ImageResponse(<Mark px={180} />, { ...size, fonts: await loadFonts() });
}
