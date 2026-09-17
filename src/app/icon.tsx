import { ImageResponse } from "next/og";
import { loadFonts } from "./og/card";
import { Mark } from "./og/mark";

export function generateImageMetadata() {
  return [
    { id: "small", size: { width: 32, height: 32 }, contentType: "image/png" },
    { id: "large", size: { width: 192, height: 192 }, contentType: "image/png" },
  ];
}

export default async function Icon({ id }: { id: Promise<string> | string }) {
  const which = await id;
  const px = which === "large" ? 192 : 32;
  return new ImageResponse(<Mark px={px} />, { width: px, height: px, fonts: await loadFonts() });
}
