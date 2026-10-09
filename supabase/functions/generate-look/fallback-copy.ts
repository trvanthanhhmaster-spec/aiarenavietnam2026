export type FallbackLookRequest = {
  eventSlug?: string;
  location?: string;
  season?: string;
  weather?: string;
  audience?: string;
  garmentSlug?: string;
  garmentVariantSlug?: string;
  accessorySlugs?: string[];
  accessoryVariantSlugs?: string[];
  colorSlug?: string;
  patternSlug?: string;
  styleSlug?: string;
  sceneSlug?: string;
  planning?: { people: Array<{ id: number; outfit: { garment: string; garmentVariant?: string; color?: string; pattern?: string; style?: string; scene?: string; accessories?: string[]; accessoryVariants?: string[] } }> };
};

export type FallbackCopy = {
  story: string;
  guardrail: string;
  genZTip: string;
  culturalScore: null;
  imagePrompt: string;
  confidence: number;
};

export function fallbackImagePrompt(
  request: FallbackLookRequest,
  catalog: Record<string, any>,
) {
  const event = catalog.event?.label || request.eventSlug || "a Vietnamese cultural event";
  const garmentType = catalog.garment?.name || request.garmentSlug || "Vietnamese traditional clothing";
  const garmentVariant = catalog.garmentVariant || {};
  const garment = garmentVariant.name || garmentType;
  const color = catalog.options?.find((item: any) => item.slug === request.colorSlug)?.label || "";
  const pattern = catalog.options?.find((item: any) => item.slug === request.patternSlug)?.label || "";
  const style = catalog.options?.find((item: any) => item.slug === request.styleSlug)?.label || "";
  const scene = catalog.options?.find((item: any) => item.slug === request.sceneSlug)?.label || request.sceneSlug || "";
  return [
    `Editorial full-body fashion portrait for ${event}.`,
    `${garment}, garment type: ${garmentType}; preserve its Vietnamese silhouette, collar, panels, buttons and sleeve construction.`,
    `Concrete item details: ${garmentVariant.silhouette || ""}; material: ${garmentVariant.material || ""}; pattern: ${garmentVariant.pattern_notes || ""}; visual reference prompt: ${garmentVariant.prompt_descriptor || ""}.`,
    `Location: ${request.location || scene}. Season: ${request.season || "current season"}. Weather: ${request.weather || "not specified"}. Palette: ${color}. Pattern: ${pattern}. Styling direction: ${style}.`,
    `Use only selected accessories: ${JSON.stringify(request.accessorySlugs || [])}; selected accessory variants: ${JSON.stringify(request.accessoryVariantSlugs || [])}. Do not invent additional accessories. Explicit color and pattern choices override the variant palette and pattern, never its garment structure.`,
    "Natural light, respectful cultural context, clean background, portrait composition, no text, no logo, no watermark.",
  ].join(" ");
}

export function fallbackCopy(
  request: FallbackLookRequest,
  catalog: Record<string, any>,
): FallbackCopy {
  const event = catalog.event || {};
  const accessories = Array.isArray(catalog.accessories) ? catalog.accessories : [];
  const accessoryVariants = Array.isArray(catalog.accessoryVariants) ? catalog.accessoryVariants : [];
  const options = Array.isArray(catalog.options) ? catalog.options : [];
  const people = request.planning?.people || [{ id: 1, outfit: {
    garment: request.garmentSlug || catalog.garment?.slug || '', garmentVariant: request.garmentVariantSlug,
    color: request.colorSlug, pattern: request.patternSlug, style: request.styleSlug, scene: request.sceneSlug,
    accessories: request.accessorySlugs || [], accessoryVariants: request.accessoryVariantSlugs || [],
  } }];
  const selected = people.map(({ id, outfit: o }) => {
    const garment = (catalog.garments || []).find((g: any) => g.slug === o.garment) || catalog.garment || {};
    const variant = (catalog.garmentVariants || []).find((v: any) => v.slug === o.garmentVariant && v.garment_id === garment.id)
      || (o.garmentVariant && catalog.garmentVariant?.slug === o.garmentVariant ? catalog.garmentVariant : {});
    const chosen = accessories.filter((a: any) => (o.accessories || []).includes(a.slug));
    const variants = accessoryVariants.filter((v: any) => (o.accessoryVariants || []).includes(v.slug) && chosen.some((a: any) => a.id === v.accessory_id));
    const names = [...chosen.filter((a: any) => !variants.some((v: any) => v.accessory_id === a.id)), ...variants].map((a: any) => a.name).filter(Boolean);
    const option = (type: string, slug?: string) => options.find((i: any) => i.option_type === type && i.slug === slug)?.label;
    const details = [option('color', o.color) ? `màu ${option('color', o.color)}` : 'giữ màu của mẫu đã chọn',
      option('pattern', o.pattern) ? `họa tiết ${option('pattern', o.pattern)}` : '',
      option('style', o.style) ? `phong cách ${option('style', o.style)}` : '',
      option('scene', o.scene) ? `bối cảnh ${option('scene', o.scene)}` : '',
      names.length ? `phụ kiện: ${names.join(', ')}` : 'không thêm phụ kiện'].filter(Boolean);
    return { id, garment, name: variant.name || garment.name || 'Việt phục', details };
  });
  const garmentNames = [...new Set(selected.map(p => p.name))].join(', ');
  const facts = [...new Set(selected.map(p => p.garment.origin_note).filter(Boolean))].join(' ');
  const guidance = [...new Set(selected.map(p => p.garment.significance_note).filter(Boolean))].join(' ');

  return {
    story: `Lựa chọn cho ${event.label || request.eventSlug || 'dịp mặc của bạn'}: ${selected.map(p => `Người ${p.id}: ${p.name}; ${p.details.join('; ')}.`).join(' ')} ${facts}`.trim(),
    guardrail: `Lưu ý tham khảo cho ${garmentNames}: giữ nguyên phom dáng, cổ áo, các thân áo và tay áo. ${guidance} Chỉ hiện đại hóa bằng phụ kiện và cách phối đã chọn; không thêm tuyên bố lịch sử ngoài dữ liệu catalog đã duyệt. Đây không phải kết luận ảnh đã đạt chuẩn văn hóa.`,
    genZTip: `Giữ ${garmentNames} làm điểm nhấn. Nếu muốn thử cách phối khác, hãy chọn rõ màu, phong cách hoặc phụ kiện trước khi tạo lại; gợi ý này không thay đổi lựa chọn hiện tại.`,
    // Catalog copy is not an AI or expert assessment of the generated image.
    culturalScore: null,
    imagePrompt: fallbackImagePrompt(request, catalog),
    confidence: 0.55,
  };
}
