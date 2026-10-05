import { fallbackCopy } from "./fallback-copy.ts";

function assert(condition: unknown, message: string) {
  if (!condition) throw new Error(message);
}

const events = [
  { slug: "school", label: "Đi học" },
  { slug: "street", label: "Dạo phố" },
  { slug: "ceremony", label: "Dự lễ" },
  { slug: "portrait", label: "Chụp ảnh" },
];

const garments = [
  {
    slug: "ao-ngu-than-tay-chen",
    name: "Áo ngũ thân tay chẽn",
    origin_note: "Dòng áo cổ truyền gắn với hệ trang phục Việt qua nhiều thời kỳ.",
    significance_note: "Giữ đúng cấu trúc năm thân và hàng cúc.",
  },
  {
    slug: "ao-tac",
    name: "Áo tấc",
    origin_note: "Một biến thể trang phục lễ phục truyền thống.",
    significance_note: "Giữ đúng tỷ lệ, cổ áo và tay rộng.",
  },
  {
    slug: "ao-nhat-binh",
    name: "Áo Nhật Bình",
    origin_note: "Gắn với phục sức cung đình triều Nguyễn.",
    significance_note: "Giữ mảng cổ và chi tiết nhận diện.",
  },
  {
    slug: "ao-tu-than",
    name: "Áo tứ thân",
    origin_note: "Gắn với hình ảnh phụ nữ vùng đồng bằng Bắc Bộ.",
    significance_note: "Giữ mối liên hệ giữa áo, yếm và thắt lưng.",
  },
];

const options = [
  { option_type: "color", slug: "indigo", label: "Chàm lam" },
  { option_type: "style", slug: "quiet-modern", label: "Tối giản hiện đại" },
];

Deno.test("catalog fallback covers the 4x4 Audition cultural matrix", () => {
  let caseCount = 0;
  for (const event of events) {
    for (const garment of garments) {
      const result = fallbackCopy(
        {
          eventSlug: event.slug,
          garmentSlug: garment.slug,
          accessorySlugs: ["sneaker-trang"],
          colorSlug: "indigo",
          styleSlug: "quiet-modern",
        },
        {
          event,
          garment,
          accessories: [{ slug: "sneaker-trang", name: "Sneaker trắng" }],
          options,
        },
      );

      assert(result.story.includes(event.label), `${event.slug}/${garment.slug}: missing event.`);
      assert(result.story.includes(garment.name), `${event.slug}/${garment.slug}: missing garment.`);
      assert(result.guardrail.includes(garment.name), `${event.slug}/${garment.slug}: missing guardrail target.`);
      assert(result.guardrail.includes("không thêm tuyên bố lịch sử"), `${event.slug}/${garment.slug}: missing anti-invention rule.`);
      assert(result.imagePrompt.includes(garment.name), `${event.slug}/${garment.slug}: missing garment in image prompt.`);
      assert(result.imagePrompt.includes("no text, no logo, no watermark"), `${event.slug}/${garment.slug}: missing visual safety.`);
      assert(result.confidence < 1, `${event.slug}/${garment.slug}: fallback confidence must stay explicit.`);
      assert(result.culturalScore === null, `${event.slug}/${garment.slug}: fallback must not fabricate a cultural score.`);
      caseCount += 1;
    }
  }
  assert(caseCount === 16, `Expected 16 cultural eval cases, received ${caseCount}.`);
});
