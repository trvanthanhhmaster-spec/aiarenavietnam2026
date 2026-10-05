-- Explicit user-requested destructive cleanup.
-- Keep the tables, Admin resources and Studio workflow; remove every current
-- catalog record so the next Studio catalog is imported and reviewed anew.

delete from public.studio_marketplace_listings;
delete from public.studio_locations;
delete from public.cultural_rules;
delete from public.studio_garment_variants;
delete from public.studio_accessory_variants;
delete from public.studio_garments;
delete from public.studio_accessories;
delete from public.studio_options;
delete from public.cultural_sources;
