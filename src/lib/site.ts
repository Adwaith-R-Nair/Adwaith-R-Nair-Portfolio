/** Canonical origin. Set NEXT_PUBLIC_SITE_URL once a domain exists; Vercel fills the rest. */
export function siteUrl(): URL {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL;
  if (explicit) return new URL(explicit);
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (vercel) return new URL(`https://${vercel}`);
  return new URL("http://localhost:3000");
}

export const absolute = (path: string): string => new URL(path, siteUrl()).toString();
