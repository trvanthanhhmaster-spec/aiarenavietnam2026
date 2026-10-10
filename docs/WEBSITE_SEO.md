# Website identity and SEO settings

Admin → Nội dung → **Thương hiệu · Logo & icon** / **SEO & chia sẻ**.

Public settings live in `pages.ui.website`; there is no schema migration or credential in this object. The dedicated editor preserves UI copy and the other section, and uses `updated_at` compare-and-swap. Generic page/UI-copy edits preserve this object rather than overwriting it. Admin authentication and CSRF checks cover reads, uploads and saves.

## What is connected

- Name, light/dark logo, favicon, Apple touch icon, 192/512 manifest icons and application theme color. Existing homepage wordmark remains the default on the video background until a custom logo is selected.
- Home and Studio title, description, image, indexing; shared image and alternative text; Google/Bing verification token; official social URLs.
- Server-rendered canonical, Open Graph, Twitter Card, WebSite/Organization JSON-LD. Home's blank SEO title/description inherits existing homepage content.
- `/robots.txt`, `/sitemap.xml`, `/site.webmanifest`, `/favicon.ico`: dynamic server routes, not manual arbitrary text/HTML editors. Sitemap includes only enabled public routes and never user looks, admin, login or API URLs. Noncanonical/local hosts get noindex and an empty sitemap.
- Private HTML pages always get noindex, regardless of global/per-page settings. No analytics/tracking scripts or external credential integration is silently added.

## Public assets

Uploads accept actual PNG/JPEG/WebP/ICO bytes, maximum 5 MB, bounded dimensions; SVG/HTML uploads and remote/signed private URLs are rejected. Icons must meet their dimensions, manifest images exactly 192/512; share images at least 600×315. Supplied default OG raster is 1200×630; MIME is detected from bytes rather than trusting its filename.

Files use a content-hash filename in persistent `/var/lib/vremix/brand-assets` on VPS (local `storage/brand-assets` otherwise), served only by the narrow `brand-asset.php` raster endpoint. This does **not** expose or change the private `generated-lookbooks` bucket. Uploaded files remain recoverable, including files replaced in configuration; there is no destructive deletion UI. Upload stores a public file; Save links it into the website. Local and production use the same settings DB, but a local filesystem is not a replica of VPS uploads.

Current-server caches are invalidated on save; another instance reads fresh settings within 30 seconds. Images are hash-versioned with immutable caching. An uncertain save requires a fresh read before another write; switching sections/closing with unsaved edits is guarded.

## Deployment and verification

Install the checked-in Nginx routes for this site; `.htaccess` provides equivalent Apache routes. Preserve the writable persistent runtime volume across releases. Default identity assets are tracked under `assets/media/brand`.

Offline: `php tests/website-settings.php`, `node tests/admin-website.cjs`, all existing CJS suites, PHP lint, synthetic rendered admin preview. Production: verify HTML tags, schema JSON, raster sizes/bytes, robots/sitemap/manifest, private-route authentication and an authenticated read/upload/save round trip. Do not call an image provider for SEO QA.

Verified on production release `b4524b7` (2026-10-10): authenticated UI upload of the existing public 1200×630 sharing image, SEO save, unchanged-brand save and subsequent read all succeeded. The public homepage emitted the uploaded asset URL and matching real raster dimensions/MIME; `tests/website-seo-live.php --live` and VPS smoke passed. Search Console/Bing verification, sitemap submission and third-party cache refresh were not performed.

Official references: [Open Graph protocol](https://ogp.me/), [Google site names](https://developers.google.com/search/docs/appearance/site-names?hl=en), [Google developer SEO guide](https://developers.google.cn/search/docs/fundamentals/get-started-developers?hl=en). Previews are illustrative; settings do not guarantee indexing, ranking, or an exact third-party card. Verification tokens do not mean a Search Console/Bing account has actually been verified. Submitting the sitemap and refreshing social-network caches remain separate external actions.
