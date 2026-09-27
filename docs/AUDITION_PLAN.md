# V-Remix - Ke hoach Audition da dinh hinh lai

Cap nhat: 2026-09-27

Tai lieu nay la nguon uu tien cho giai doan Audition. Ke hoach nen tang dai han
van duoc giu lai, nhung khong duoc lam cham hoac lam mong luong demo cot loi.

## 1. Muc tieu san pham

V-Remix giup nguoi dung chon boi canh, Viet phuc, mau sac va phu kien hien dai,
sau do tao mot lookbook 9:16 co giai thich van hoa ro rang.

Thong diep demo:

> Viet phuc khong chi duoc luu giu; no co the duoc hieu dung, phoi dung va song
> trong boi canh hien dai.

## 2. Hanh trinh demo bat buoc

1. Nguoi xem vao Tang 1 va thay trai nghiem cinematic V-Remix.
2. Bam "Kham pha ngay" de vao Studio.
3. Chon boi canh, co phuc, phoi sac va phu kien.
4. Co the tai anh dai dien len, nhung khong bat buoc.
5. Bam "Tao ban phoi".
6. Nhan mot ket qua on dinh gom:
   - Anh AI 9:16.
   - Cac phuong an lookbook de so sanh.
   - Story Card.
   - Cultural Guardrail.
   - Meo Gen Z.
   - Nut tai ket qua.
7. Neu video san sang, hien thi video nhu mot lop nang cao. Neu video cham hoac
   loi, lookbook anh van phai hoan tat va demo van tiep tuc.

Muc tieu la hoan thanh hanh trinh nay trong khoang 90 giay khi thuyet trinh.

## 3. Scope lock cho Audition

### P0 - Bat buoc phai on dinh

- Bao toan visual, media transition va CTA cua Tang 1.
- Studio desktop va mobile doc catalog that tu Supabase.
- Gemini tao prompt co version, Story Card, Guardrail va meo phoi.
- Tao it nhat mot anh ket qua 9:16; toi da bon anh neu provider cho phep.
- Luu asset vao Supabase Storage va tra signed URL.
- Generation job co `queued`, `processing`, `completed`, `failed`.
- Khong tao job trung khi nguoi dung reload hoac bam lai.
- Co the tiep tuc theo doi job dang chay sau khi reload trang.
- Co fallback ro rang khi AI timeout, quota het hoac Storage loi.
- Khong de provider key trong HTML hoac JavaScript phia client.
- Co mot kich ban demo du phong da duoc kiem thu.

### P1 - Chi lam sau khi P0 dat

- Video Veo 8 giay cho ket qua.
- Dung anh lookbook da duyet lam first frame cua video de giu nhan vat va trang
  phuc nhat quan.
- Tai video MP4 va trang thai tien trinh rieng.
- Mot tro ly hoi thoai ngan dua tren ket qua da tao.

Video la progressive enhancement. Video khong duoc chan viec hien thi anh,
Story Card hay nut tai lookbook.

### Sau Audition

- Supabase Auth email/password.
- Thu vien ca nhan, gallery, link chia se va quyen xoa du lieu.
- Admin CRUD, bien tap noi dung va duyet van hoa.
- Roles, partner workspace, doanh nghiep, truong hoc va su kien.
- Generated asset tables chuan hoa thay vi chi luu JSON trong job.
- Dashboard eval, chi phi, quota va observability day du.

## 4. Trang thai hien tai

| Hang muc | Trang thai | Khoang trong |
| --- | --- | --- |
| Tang 1 data-driven | Da co | Can visual QA day du tren desktop/mobile va moi branch |
| Supabase catalog | Da co ban dau | Noi dung van hoa con ngan, chua co bo nguon da duyet thuc te |
| Studio selector | Da co | Can test thao tac, responsive va accessibility theo kich ban demo |
| Gemini text/prompt | Da co mot prompt v1 | Chua co eval cases, schema validation va prompt regression |
| Image generation | Da noi provider | Can danh gia chat luong, identity consistency va fallback asset |
| Lookbook | Hien thi toi da bon anh | Chua co persistence rieng, resume va gallery |
| Video generation | Da chay duoc qua Vertex bridge | API-key Gemini route thieu prepaid balance; video dang bi uu tien qua muc |
| Job polling | Da co | Reload mat job; chua chong submit trung; chua co cancel |
| Download | Da co cho mot asset | Chua co lookbook composite 9:16 hoan chinh |
| Auth/admin/share | Chua co | De sau Audition |
| VPS/domain | Chua co | Chi lam sau khi P0 va demo script da khoa |

## 5. Kien truc Audition

```text
Tang 1 / Studio PHP
        |
        | catalog public
        v
Supabase Postgres
        |
        | POST /generate-look
        v
Supabase Edge Function
        |-- Gemini text: story + guardrail + image prompt
        |-- Gemini image: lookbook 9:16
        |-- Supabase Storage: generated assets
        `-- generation_jobs: trang thai va output

Video tuy chon:
Edge Function -> provider adapter -> Veo -> Storage
```

Quyet dinh provider:

- Text va anh tiep tuc chay server-side qua Edge Function.
- Video duoc tach bang `GOOGLE_VIDEO_PROVIDER`.
- Hien tai dung Vertex bridge vi no da duoc kiem thu voi Google Cloud credits.
- Chi chuyen sang Gemini API key khi prepaid balance da san sang va test that
  hoan tat.
- Khong them provider hoac ha tang moi neu khong cai thien truc tiep demo P0.

## 6. Thu tu phat trien moi

### Milestone A - Khoa luong demo

- Luu `jobId` va input dang chay trong browser storage.
- Resume polling sau reload.
- Vo hieu hoa submit trong khi job dang chay.
- Tach trang thai image va video de video khong chan lookbook.
- Them retry co kiem soat va thong bao loi tieng Viet nhat quan.

Trang thai hien tai: da trien khai idempotency theo `clientRequestId`, resume
theo `jobId`/`requestId`, chong submit trung, va cho phep anh hien thi khi video
con dang xu ly. Phan cancel job va test browser full-flow van con lai.

### Milestone B - Khoa chat luong ket qua

- Dinh nghia JSON schema cho output Gemini.
- Tao bo eval toi thieu cho bon loai trang phuc va bon boi canh.
- Gan nguon van hoa da duyet cho tung garment.
- Kiem tra prompt version va output khong bia thong tin lich su.
- Tao fallback lookbook duoc duyet cho kich ban demo.

Trang thai hien tai: da them schema parser va test cho `story`, `guardrail`,
`genZTip`, `imagePrompt`, `confidence`; prompt v1 tren Supabase da duoc dong bo
voi contract nay. Bo eval van hoa, nguon duoc duyet va fallback lookbook van con
lai.

### Milestone C - Khoa trai nghiem trinh bay

- Visual QA Tang 1 va Studio tren desktop/mobile.
- Kiem thu media loading, error state, keyboard va reduced motion.
- Xuat mot lookbook composite 9:16 thay vi chi tai mot anh don.
- Viet demo script 90 giay va chay thu tu dau den cuoi.

### Milestone D - Video tuy chon

- Chi bat dau khi A-C dat.
- Dung anh lookbook dau vao Veo.
- Video co trang thai rieng va khong lam that bai job anh.
- Kiem thu chi phi, quota, timeout va fallback.

### Milestone E - Deploy

- Deploy VPS/domain.
- Smoke test production, Supabase, Storage va Edge Function.
- Dong bo GitHub va XAMPP.
- Dong bang mot ban demo co the rollback.

## 7. Tieu chi nghiem thu P0

- Tang 1 vao duoc Studio ma khong mat trai nghiem cinematic.
- Them option catalog moi khong can sua PHP/JavaScript loi.
- Mot lan bam tao chi sinh mot generation job.
- Reload trang trong luc tao van tiep tuc dung job cu.
- Anh ket qua, Story Card va Guardrail hien thi khi video chua san sang.
- Ket qua co the tai o ti le 9:16.
- Provider key khong xuat hien trong HTML, JavaScript hoac network response.
- Loi quota, timeout, Storage va media deu co thong bao/fallback ro rang.
- PHP lint, `node --check`, `deno check`, HTTP smoke test va visual QA dat.

## 8. Nguyen tac thay doi

- Moi task phai gan voi mot milestone trong tai lieu nay.
- Khong mo rong Auth/admin/partner truoc khi P0 dat.
- Khong toi uu provider video truoc khi luong anh va fallback on dinh.
- Moi thay doi: kiem tra local -> commit -> push GitHub -> dong bo XAMPP.
- Neu mot thu nghiem provider that bai, phai quay ve cau hinh demo da kiem thu.
