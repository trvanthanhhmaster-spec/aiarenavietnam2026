# Fashion network v1

Scope: a curated directory, merchant submissions and contact links. It is not a
checkout, inventory, reservation or nationwide verified-partner claim.

## Routes and workflow

- `shops.php`: public directory, name/province search and pagination.
- `shops.php?shop=<uuid>`: published shop, garment filter, actual product variants,
  rental/purchase/made-to-order terms and external source/contact links.
- `shops.php?mode=merchant`: existing V-Remix login; register up to three shop
  profiles and submit up to 100 products per shop. A form currently describes one
  variant and one externally hosted image per product; no upload/CSV adapter yet.
- `shops.php?mode=review`: admin only; review shops before products, publish,
  request corrections or archive. Ten shops per page and their products.
- Admin's Catalog group links to review; Studio's sourcing panel links to the
  public directory. Existing curated sourcing listings remain separate.

No existing shop links are automatically promoted to verified partner records.
There are no seeded fake shops, prices or merchant accounts.

## Data and permissions

Migration `20261010150000_fashion_network.sql` adds shops, private membership,
products, variants, media, offers and a private review log. Commercial descriptions
do not replace cultural knowledge. The schema separates image-display permission
from generative-AI permission and keeps evidence private. Granting AI permission
does **not** connect these external images to the generation pipeline yet.

PHP derives the actor from the authenticated session and validates CSRF and bounded
fields. Service-only transactional RPCs independently check membership/admin roles,
expected revision, child records, review constraints and per-owner quotas. RLS
exposes only published shops/products and their permitted children. No direct
anonymous/authenticated writes or public evidence access are granted.

Submitting changes unpublishes that entity and resets verification. Updating a
shop therefore hides all its products until shop review; updating a product only
hides that product. Foreign entities cannot be edited or claimed. Ambiguous writes
are not automatically retried; repeated request IDs conflict instead of duplicating.

Prices are VND per explicit unit; unknown is NULL, not zero. Rental deposits and
separately charged accessories belong in their own fields/terms. The displayed
timestamp is when the merchant supplied an offer, **not** a stock check. Availability
remains contact/unknown in v1. Review timestamps establish editorial review only,
not quality certification or historical endorsement.

Only public HTTPS URLs are accepted. The server never fetches/scrapes the submitted
site or image; the browser displays approved images with no-referrer. Broken images
retain a visible source-link fallback. Do not submit private links or tokens.

## Verification

- `php tests/fashion-network.php`: input, price/consent and auth-return contracts.
- `php tests/fashion-network-view.php`: deterministic templates, escaping and states.
- `node tests/fashion-network-ui.cjs`: image failure, conditional units, submission
  feedback, repeat-submit prevention and browser-history reset.
- `php tests/fashion-network-preview.php <private-temp-dir>` and the loopback-only
  `tests/fashion-network-router.php`: explicitly synthetic browser QA, not partners.
- `supabase db query --linked --file tests/fashion-network-transaction.sql`:
  disposable users/shop/products entirely inside a rolled-back transaction; tests
  tenant isolation, admin review, conflicts, permissions, child atomicity, published
  reads and archived-parent RLS. No AI calls or merchant communications.

The onboarding directory currently uses noindex metadata along with private
merchant/review pages. A dedicated public SEO configuration/sitemap should be
enabled once genuine reviewed partner content is available, not for an empty page.

## Next slices

1. Partner onboarding and legitimate display/AI usage permission from real shops.
2. Signed partner feeds/CSV and reviewed import, per-source provenance and expiry.
3. Licensed media ingestion into controlled storage, then exact selected product /
   variant snapshot in the Studio generation contract and assessment. Existing
   creative generations must not be advertised as exact available merchandise.
4. Merchant verification, multi-user shop invitations, regional/search indexes,
   moderation/reporting and revision history before wider public acquisition.
5. Enquiries/reservations/payment only under a separately defined operational,
   dispute-handling and privacy scope. None are included in this release.
