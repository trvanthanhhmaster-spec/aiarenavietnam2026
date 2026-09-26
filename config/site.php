<?php
declare(strict_types=1);

$site = [
    'name' => 'V-Remix',
    'brand_mark' => 'V',
    'brand_name' => 'Remix',
    'title' => 'V-Remix — Việt phục, theo cách bạn',
    'description' => 'Khám phá cách mặc Việt phục khi đi học, dạo phố, dự lễ hoặc chụp ảnh. Gần gũi hơn với trang phục Việt, tự tin hơn với phong cách của bạn.',
    'preview_note' => 'Bản xem thử · Video minh hoạ chưa theo từng dịp mặc.',
    'hero_line_one' => 'Việt phục,',
    'hero_line_two' => 'theo cách bạn.',
    'hero_description_one' => 'Đi học, xuống phố hay dự lễ?',
    'hero_description_two' => 'Khám phá cách phối đồ Việt vừa hợp dịp, vừa là bạn.',
    'controller_label' => 'Bạn mặc đi đâu?',
    'cta_label' => 'Khám phá ngay',
    'ui' => [
        'controller_aria_label' => 'Chọn dịp mặc để xem minh hoạ',
        'brand_aria_label' => 'Trang chủ V-Remix',
        'retry_label' => 'Thử lại',
        'reset_label' => 'Chọn lại',
        'return_aria_label' => 'Trở về để chọn dịp mặc khác',
        'status_loading' => 'Đang tải các hiệu ứng chuyển cảnh.',
        'status_ready' => 'Mọi hiệu ứng chuyển cảnh đã sẵn sàng.',
        'status_prepare' => 'Hình ảnh đang được chuẩn bị. Bạn chờ một chút nhé.',
        'status_opening' => 'Đang mở bản xem thử cho lựa chọn {label}.',
        'status_selected' => 'Đã chọn {label}. Đây là video minh hoạ. Nhấn Chọn lại để xem lựa chọn khác.',
        'status_returning' => 'Đang trở về khung cảnh ban đầu.',
        'status_returned' => 'Đã trở về khung cảnh ban đầu.',
        'error_video_load' => 'Không tải được video. Vui lòng thử lại.',
        'error_video_blocked' => 'Trình duyệt đã chặn phát video.',
        'error_video_timeout' => 'Video {label} tải quá lâu. Vui lòng thử lại.',
        'error_video_playback' => 'Không phát được video {label}.',
    ],
];

$defaultMediaUrl = 'https://pub-17538b171cce44888cd5fc146559c986.r2.dev/folder01/Create_continuous_five-second_tr%E2%80%A6_1080p_20260926121852.mp4';

$branches = [
    'scene' => ['label' => 'Đi học', 'fwdGuard' => 0.08, 'revGuard' => 0.18, 'forwardUrl' => $defaultMediaUrl, 'reverseUrl' => $defaultMediaUrl],
    'light' => ['label' => 'Dạo phố', 'fwdGuard' => 0.08, 'revGuard' => 0.08, 'forwardUrl' => $defaultMediaUrl, 'reverseUrl' => $defaultMediaUrl],
    'colorway' => ['label' => 'Dự lễ', 'fwdGuard' => 0.08, 'revGuard' => 0.08, 'forwardUrl' => $defaultMediaUrl, 'reverseUrl' => $defaultMediaUrl],
    'fullLook' => ['label' => 'Chụp ảnh', 'fwdGuard' => 0.08, 'revGuard' => 0.08, 'forwardUrl' => $defaultMediaUrl, 'reverseUrl' => $defaultMediaUrl],
];
