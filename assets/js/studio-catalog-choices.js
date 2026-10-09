(function (root, factory) {
  'use strict';
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.VRemixCatalogChoices = api;
}(typeof window !== 'undefined' ? window : this, function () {
  'use strict';
  function samples(catalog, garmentSlug) {
    var garment = (catalog.garments || []).find(function (row) { return row.slug === garmentSlug; });
    return garment ? (catalog.garmentVariants || []).filter(function (row) { return row.garment_id === garment.id; }) : [];
  }
  function colors(catalog, garmentSlug, selected) {
    var garment = (catalog.garments || []).find(function (row) { return row.slug === garmentSlug; });
    if (!garment) return [];
    var palette = Array.isArray(garment.default_colors) ? garment.default_colors.slice() : [];
    samples(catalog, garmentSlug).forEach(function (row) {
      if (Array.isArray(row.color_palette)) palette = palette.concat(row.color_palette);
    });
    // Restored overrides stay visible and intact, even outside today's palette.
    return (catalog.colors || []).filter(function (row) { return palette.indexOf(row.slug) !== -1 || row.slug === selected; })
      .map(function (row) { return Object.assign({}, row, { legacyOverride: palette.indexOf(row.slug) === -1 }); });
  }
  function sourceUrl(value) {
    return /^https?:\/\/[^\s]+$/i.test(String(value || '')) ? String(value) : '';
  }
  function sceneImage(slug) {
    var files = { campus: 'scene-campus.webp', 'old-quarter': 'scene-old-quarter.webp', temple: 'scene-van-mieu.webp', citadel: 'scene-citadel.webp', studio: 'scene-studio.webp' };
    return files[slug] ? 'assets/media/catalog/' + files[slug] : '';
  }
  function selectSample(state, catalog, slug) {
    if (!samples(catalog, state.garment).some(function (row) { return row.slug === slug; })) return false;
    state.garmentVariant = slug;
    // A photo sample and its curated descriptor are one choice. Previously
    // chosen global motifs must not silently override this explicit choice.
    state.color = '';
    state.pattern = '';
    return true;
  }
  return { samples: samples, colors: colors, sourceUrl: sourceUrl, sceneImage: sceneImage, selectSample: selectSample };
}));
