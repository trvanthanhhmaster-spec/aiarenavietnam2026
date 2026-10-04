# V-Remix Catalog Architecture

## Mô hình dữ liệu

Catalog dùng hai cấp:

1. `studio_garments` và `studio_accessories` là taxonomy ổn định, ví dụ
   `Áo tấc` hoặc `Túi tote`.
2. `studio_garment_variants` và `studio_accessory_variants` là mẫu cụ thể mà
   người dùng chọn. Mỗi mẫu có ảnh, chất liệu, họa tiết, bảng màu, mô tả prompt
   và metadata nguồn.

Studio chỉ đọc mẫu thỏa cả hai điều kiện:

```text
review_status = published
is_active = true
```

## Luồng tìm và nhập nguồn

Admin mở `catalog-search.php`, chọn nhóm trang phục hoặc phụ kiện, rồi tìm trên
Wikimedia Commons. Provider chỉ gọi host API cố định của Wikimedia và giữ:

- ảnh gốc và thumbnail;
- URL trang nguồn;
- tác giả;
- giấy phép;
- ID đối tượng bên provider.

Kết quả nhập vào Supabase với:

```text
review_status = draft
is_active = false
```

Admin tiếp tục điền mô tả tiếng Việt, kiểu dáng, chất liệu, màu, họa tiết và
prompt descriptor trong mục `Mẫu cổ phục` hoặc `Mẫu phụ kiện`. Chỉ sau khi rà
soát nguồn và đổi sang `published + active`, mẫu mới xuất hiện trong Studio.

Không lấy nội dung từ domain tùy ý và không tự động xuất bản kết quả tìm kiếm.

## Hợp đồng generation

Studio gửi cả loại và mẫu cụ thể:

```json
{
  "garmentSlug": "ao-tac",
  "garmentVariantSlug": "ao-tac-lua-ma-chau",
  "accessorySlugs": ["tui-tote"],
  "accessoryVariantSlugs": ["tui-tote-canvas-be"]
}
```

Edge Function kiểm tra mẫu trang phục có thuộc đúng loại cha và tất cả mẫu đều
đang được duyệt. Prompt nhận thêm `material`, `silhouette`, `pattern_notes`,
`color_palette` và `prompt_descriptor` để AI bám theo mẫu cụ thể.

## Mở rộng provider

Wikimedia là provider đầu tiên. Provider brand/đối tác có thể bổ sung sau bằng
cùng hợp đồng metadata, nhưng dữ liệu vẫn phải vào bảng variant ở trạng thái
nháp. API key hoặc credential của provider chỉ nằm phía server, không đưa vào
HTML/JavaScript.
