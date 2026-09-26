alter table public.pages
    add column if not exists ui jsonb not null default '{}'::jsonb;

update public.pages
set ui = jsonb_build_object(
    'controller_aria_label', 'Chọn dịp mặc để xem minh hoạ',
    'brand_aria_label', 'Trang chủ V-Remix',
    'retry_label', 'Thử lại',
    'reset_label', 'Chọn lại',
    'return_aria_label', 'Trở về để chọn dịp mặc khác',
    'status_loading', 'Đang tải các hiệu ứng chuyển cảnh.',
    'status_ready', 'Mọi hiệu ứng chuyển cảnh đã sẵn sàng.',
    'status_prepare', 'Hình ảnh đang được chuẩn bị. Bạn chờ một chút nhé.',
    'status_opening', 'Đang mở bản xem thử cho lựa chọn {label}.',
    'status_selected', 'Đã chọn {label}. Đây là video minh hoạ. Nhấn Chọn lại để xem lựa chọn khác.',
    'status_returning', 'Đang trở về khung cảnh ban đầu.',
    'status_returned', 'Đã trở về khung cảnh ban đầu.',
    'error_video_load', 'Không tải được video. Vui lòng thử lại.',
    'error_video_blocked', 'Trình duyệt đã chặn phát video.',
    'error_video_timeout', 'Video {label} tải quá lâu. Vui lòng thử lại.',
    'error_video_playback', 'Không phát được video {label}.'
)
where slug = 'home';
