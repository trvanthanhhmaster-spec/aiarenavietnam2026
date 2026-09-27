export type FallbackLookRequest = {
  eventSlug?: string;
  garmentSlug?: string;
  accessorySlugs?: string[];
  colorSlug?: string;
  styleSlug?: string;
};

export type FallbackCopy = {
  story: string;
  guardrail: string;
  genZTip: string;
  imagePrompt: string;
  confidence: number;
};

export function fallbackImagePrompt(
  request: FallbackLookRequest,
  catalog: Record<string, any>,
) {
  const event = catalog.event?.label || request.eventSlug || "a Vietnamese cultural event";
  const garment = catalog.garment?.name || request.garmentSlug || "Vietnamese traditional clothing";
  const color = catalog.options?.find((item: any) => item.slug === request.colorSlug)?.label || "";
  const style = catalog.options?.find((item: any) => item.slug === request.styleSlug)?.label || "";
  return [
    `Editorial full-body fashion portrait for ${event}.`,
    `${garment}, preserve its Vietnamese silhouette, collar, panels, buttons and sleeve construction.`,
    `Palette: ${color}. Styling direction: ${style}.`,
    "Contemporary accessories may be subtle, but the traditional garment remains the visual centre.",
    "Natural light, respectful cultural context, clean background, portrait composition, no text, no logo, no watermark.",
  ].join(" ");
}

export function fallbackCopy(
  request: FallbackLookRequest,
  catalog: Record<string, any>,
): FallbackCopy {
  const event = catalog.event || {};
  const garment = catalog.garment || {};
  const accessories = Array.isArray(catalog.accessories) ? catalog.accessories : [];
  const options = Array.isArray(catalog.options) ? catalog.options : [];
  const color = options.find((item: any) => item.slug === request.colorSlug && item.option_type === "color");
  const style = options.find((item: any) => item.slug === request.styleSlug && item.option_type === "style");
  const accessoryNames = accessories.map((item: any) => item.name).filter(Boolean);
  const accessoryText = accessoryNames.length ? accessoryNames.join(", ") : "không thêm phụ kiện";
  const origin = garment.origin_note || "một dòng trang phục truyền thống Việt";
  const significance = garment.significance_note || "giữ nguyên những chi tiết nhận diện đã được duyệt";
  const colorLabel = color?.label || request.colorSlug || "màu trung tính";
  const styleLabel = style?.label || request.styleSlug || "tối giản hiện đại";

  return {
    story: `${garment.name || "Việt phục"} xuất hiện trong bối cảnh ${event.label || request.eventSlug || "hiện đại"} với bảng màu ${colorLabel} và tinh thần ${styleLabel}. ${origin} Bản phối dùng ${accessoryText} để tạo nhịp mới nhưng vẫn đặt dáng áo làm trung tâm.`,
    guardrail: `Giữ nguyên phom dáng, cổ áo, hàng cúc, các thân áo và tay áo của ${garment.name || "trang phục đã chọn"}. ${significance} Chỉ hiện đại hóa bằng phụ kiện và cách phối đã chọn; không thêm tuyên bố lịch sử ngoài dữ liệu catalog đã duyệt.`,
    genZTip: `Chọn một điểm nhấn vừa đủ — ${accessoryText} — rồi giữ phần còn lại gọn để ${garment.name || "dáng Việt"} vẫn là nhân vật chính trong ảnh.`,
    imagePrompt: fallbackImagePrompt(request, catalog),
    confidence: 0.55,
  };
}
