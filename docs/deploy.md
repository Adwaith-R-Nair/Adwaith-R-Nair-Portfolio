# Deploying

The site is a static Next.js build. Every page, social card and icon is generated at build time, so there is nothing to configure at runtime and no secrets to store.

## First deploy

1. Go to vercel.com, choose **Add New** then **Project**, and import `Adwaith-R-Nair/Adwaith-R-Nair-Portfolio`.
2. Accept every default. Vercel detects Next.js, pnpm and the build command on its own. Do not add environment variables yet.
3. Press **Deploy**. The first build takes two to three minutes, most of it installing dependencies and generating the eleven images.
4. Open the URL Vercel gives you, something like `adwaith-r-nair-portfolio.vercel.app`.

Vercel sets `VERCEL_PROJECT_PRODUCTION_URL` itself, and `src/lib/site.ts` reads it, so the canonical link, the sitemap and the social card URLs are all correct on the first deploy with no configuration.

## Checks on the live URL

| What | How |
|---|---|
| Pages | Open the home page and all six `/work/` pages. |
| Sitemap | `<your-url>/sitemap.xml` should list seven URLs on your domain, not localhost. |
| Robots | `<your-url>/robots.txt` should allow all and name the sitemap. |
| Social card | Paste the URL into LinkedIn's Post Inspector, or just into a WhatsApp message to yourself. The card should show the portrait and the thesis line. |
| Project card | Do the same with `<your-url>/work/praman`. It should show Praman, not the home card. |
| Icon | The browser tab should show the serif A. |
| Particles | The hero portrait should resolve into particles about a second after load. |
| Analytics | Vercel's dashboard, Analytics tab, should count your visit within a minute. |

## Attaching a domain later

1. Buy the domain, then in Vercel open the project, **Settings**, **Domains**, and add it. Vercel prints the DNS records to set at your registrar.
2. In **Settings**, **Environment Variables**, add `NEXT_PUBLIC_SITE_URL` with the value `https://your-domain.com` for the Production environment.
3. Redeploy, from the Deployments tab, **Redeploy** on the latest one. The environment variable is read at build time, so a redeploy is required; a DNS change alone is not enough.
4. Re-run the sitemap and card checks above. Every URL should now be on the new domain.

Step 2 is the only code-adjacent step, and it exists so that attaching a domain never needs a commit.

## Preview deployments

Every push to a branch, and every pull request, gets its own URL. Those builds have no `NEXT_PUBLIC_SITE_URL`, so their canonical links and sitemaps point at the preview host. That is correct: preview builds should not claim to be the real site.

## Rollback

Deployments tab, find a known-good deployment, **Promote to Production**. This is instant and does not rebuild.

## What runs in CI, and what does not

GitHub Actions runs typecheck, lint, unit tests, the build, the JavaScript budget check, Playwright and Lighthouse on every push. Vercel runs its own build independently. A red Actions run does not block a Vercel deploy, so check Actions before treating a deploy as good.
