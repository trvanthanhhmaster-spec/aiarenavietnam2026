<?php
declare(strict_types=1);

require __DIR__ . '/src/Support/Env.php';
require __DIR__ . '/src/Support/SupabaseAuth.php';
require __DIR__ . '/src/Infrastructure/SupabaseAdminClient.php';

use App\Infrastructure\SupabaseAdminClient;
use App\Support\Env;
use App\Support\SupabaseAuth;

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

$respond = static function (mixed $body, int $status = 200): never {
    http_response_code($status);
    echo json_encode($body, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR);
    exit;
};

Env::load(__DIR__ . '/.env');
$auth = new SupabaseAuth(
    (string) getenv('SUPABASE_URL'),
    (string) getenv('SUPABASE_ANON_KEY'),
    (string) getenv('SUPABASE_SERVICE_ROLE_KEY')
);
$auth->boot();
if ($auth->user() === null || !$auth->isAdmin()) {
    $respond(['error' => 'Tài khoản không có quyền quản trị.'], 403);
}

$csrf = (string) ($_SERVER['HTTP_X_CSRF_TOKEN'] ?? '');
if (!$auth->verifyCsrf($csrf)) {
    $respond(['error' => 'CSRF token không hợp lệ. Hãy tải lại trang quản trị.'], 403);
}

$supabaseUrl = rtrim((string) getenv('SUPABASE_URL'), '/');
$serviceRoleKey = (string) getenv('SUPABASE_SERVICE_ROLE_KEY');
if ($supabaseUrl === '' || $serviceRoleKey === '') {
    $respond(['error' => 'Thiếu SUPABASE_SERVICE_ROLE_KEY trong cấu hình server.'], 503);
}

if (in_array($_GET['resource'] ?? '', ['brand', 'seo'], true)) {
    require __DIR__ . '/src/Support/WebsiteMetadata.php';
    require __DIR__ . '/src/Infrastructure/WebsiteSettings.php';
    require __DIR__ . '/src/Infrastructure/BrandAssets.php';
    $websiteDb = require __DIR__ . '/config/database.php';
    try {
        $website = new App\Infrastructure\WebsiteSettings(new SupabaseAdminClient($supabaseUrl, $serviceRoleKey), $websiteDb['site_slug'], $websiteDb['cache_file']);
        if ($_SERVER['REQUEST_METHOD'] === 'GET') $respond($website->read());
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') { header('Allow: GET, POST'); $respond(['error' => 'Chỉ hỗ trợ GET và POST.'], 405); }
        if (str_starts_with((string) ($_SERVER['CONTENT_TYPE'] ?? ''), 'multipart/form-data')) {
            $file = $_FILES['asset'] ?? [];
            if (!is_array($file) || ($file['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK || !is_uploaded_file($file['tmp_name'] ?? '') || ($file['size'] ?? 0) > 5_000_000) $respond(['error' => 'Tải ảnh không thành công. Chọn ảnh tối đa 5 MB.'], 422);
            $respond(['asset' => App\Infrastructure\BrandAssets::store((string) file_get_contents($file['tmp_name']), (string) ($_POST['purpose'] ?? ''))]);
        }
        $raw = file_get_contents('php://input', false, null, 0, 32769);
        if ($raw === false || strlen($raw) > 32768) $respond(['error' => 'Cấu hình quá lớn.'], 413);
        $input = json_decode($raw, true, 64, JSON_THROW_ON_ERROR);
        if (!is_array($input) || ($input['action'] ?? '') !== 'save') $respond(['error' => 'Thao tác không hợp lệ.'], 422);
        $respond($website->save((string) $_GET['resource'], $input['values'] ?? null, (string) ($input['revision'] ?? '')));
    } catch (InvalidArgumentException|JsonException $error) {
        $respond(['error' => $error instanceof JsonException ? 'Cấu hình JSON không hợp lệ.' : $error->getMessage()], 422);
    } catch (Throwable $error) {
        error_log('[V-Remix] Website configuration failed (' . get_class($error) . ').');
        $respond(['error' => $error->getCode() === 409 ? $error->getMessage() : 'Chưa lưu được cấu hình. Làm mới để kiểm tra trước khi thử lại.'], $error->getCode() === 409 ? 409 : 502);
    }
}

// Provider configuration is not a database resource. The shared admin and CSRF
// checks above also apply to reads; never expose the Management API response.
if (($_GET['resource'] ?? '') === 'google-auth') {
    require __DIR__ . '/src/Infrastructure/GoogleAuthSettings.php';
    try {
        $google = new App\Infrastructure\GoogleAuthSettings(
            $supabaseUrl, (string) getenv('SUPABASE_ANON_KEY'), (string) getenv('SUPABASE_MANAGEMENT_TOKEN')
        );
        if ($_SERVER['REQUEST_METHOD'] === 'GET') {
            $respond($google->read());
        }
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            header('Allow: GET, POST');
            $respond(['error' => 'Phương thức không được hỗ trợ.'], 405);
        }
        $raw = file_get_contents('php://input', false, null, 0, 8193);
        if ($raw === false || strlen($raw) > 8192) {
            $respond(['error' => 'Dữ liệu cấu hình quá lớn.'], 413);
        }
        $input = json_decode($raw);
        if (!is_object($input)) {
            $respond(['error' => 'Cần gửi một đối tượng cấu hình JSON.'], 400);
        }
        $respond($google->save(get_object_vars($input)));
    } catch (RuntimeException $error) {
        $code = $error->getCode();
        $respond(['error' => $error->getMessage()], in_array($code, [409, 422, 429, 502, 503], true) ? $code : 502);
    } catch (Throwable $error) {
        // Upstream errors can contain credentials; no raw body/message in logs or JSON.
        error_log('Google Auth configuration failed (' . get_class($error) . ').');
        $respond(['error' => 'Không thể xử lý cấu hình Google. Vui lòng làm mới để kiểm tra.'], 502);
    }
}

$resources = [
    'ai-settings' => [
        'table' => 'ai_runtime_settings',
        'select' => 'id,generation_enabled,image_provider,video_provider,text_model,image_model,video_model,image_variants,image_unit_cost_vnd,video_unit_cost_vnd,daily_budget_vnd,monthly_budget_vnd,encrypted_gemini_api_key,gemini_api_key_hint,updated_at',
        'order' => 'id.asc',
        'fields' => ['generation_enabled', 'image_provider', 'video_provider', 'text_model', 'image_model', 'video_model', 'image_variants', 'image_unit_cost_vnd', 'video_unit_cost_vnd', 'daily_budget_vnd', 'monthly_budget_vnd'],
        'no_create' => true,
        'no_delete' => true,
    ],
    'studio-generation' => [
        'table' => 'studio_generation_settings',
        'select' => 'id,canvas_aspect_ratio,target_resolution,default_generation_mode,default_output_type,preview_media_url,preview_poster_url,base_prompt,frame_plan,updated_at',
        'order' => 'id.asc',
        'fields' => ['canvas_aspect_ratio', 'target_resolution', 'default_generation_mode', 'default_output_type', 'preview_media_url', 'preview_poster_url', 'base_prompt', 'frame_plan'],
        'no_create' => true,
        'no_delete' => true,
    ],
    'events' => [
        'table' => 'studio_events',
        'select' => 'id,slug,label,description,cultural_context,preset,sort_order,is_active,created_at,updated_at',
        'order' => 'sort_order.asc',
        'fields' => ['slug', 'label', 'description', 'cultural_context', 'preset', 'sort_order', 'is_active'],
    ],
    'garments' => [
        'table' => 'studio_garments',
        'select' => 'id,slug,name,category,description,origin_note,significance_note,image_url,thumbnail_url,prompt_descriptor,negative_descriptor,allowed_contexts,default_colors,source_id,sort_order,is_active,created_at,updated_at',
        'order' => 'sort_order.asc',
        'fields' => ['slug', 'name', 'category', 'description', 'origin_note', 'significance_note', 'image_url', 'thumbnail_url', 'prompt_descriptor', 'negative_descriptor', 'allowed_contexts', 'default_colors', 'source_id', 'sort_order', 'is_active'],
    ],
    'garment-variants' => [
        'table' => 'studio_garment_variants',
        'select' => 'id,garment_id,slug,name,description,silhouette,material,pattern_notes,color_palette,image_url,thumbnail_url,prompt_descriptor,negative_descriptor,source_id,source_url,source_provider,source_external_id,review_status,sort_order,is_active,created_at,updated_at',
        'order' => 'sort_order.asc,created_at.desc',
        'fields' => ['garment_id', 'slug', 'name', 'description', 'silhouette', 'material', 'pattern_notes', 'color_palette', 'image_url', 'thumbnail_url', 'prompt_descriptor', 'negative_descriptor', 'source_id', 'source_url', 'source_provider', 'source_external_id', 'review_status', 'sort_order', 'is_active'],
    ],
    'accessories' => [
        'table' => 'studio_accessories',
        'select' => 'id,slug,name,category,description,image_url,thumbnail_url,prompt_descriptor,compatibility,sort_order,is_active,created_at,updated_at',
        'order' => 'sort_order.asc',
        'fields' => ['slug', 'name', 'category', 'description', 'image_url', 'thumbnail_url', 'prompt_descriptor', 'compatibility', 'sort_order', 'is_active'],
    ],
    'accessory-variants' => [
        'table' => 'studio_accessory_variants',
        'select' => 'id,accessory_id,slug,name,description,material,color_palette,image_url,thumbnail_url,prompt_descriptor,source_id,source_url,source_provider,source_external_id,review_status,sort_order,is_active,created_at,updated_at',
        'order' => 'sort_order.asc,created_at.desc',
        'fields' => ['accessory_id', 'slug', 'name', 'description', 'material', 'color_palette', 'image_url', 'thumbnail_url', 'prompt_descriptor', 'source_id', 'source_url', 'source_provider', 'source_external_id', 'review_status', 'sort_order', 'is_active'],
    ],
    'marketplace' => [
        'table' => 'studio_marketplace_listings',
        'select' => 'id,item_type,garment_id,accessory_id,provider_name,listing_type,title,address,province,price_from_vnd,price_to_vnd,external_url,source_url,verified_at,sort_order,is_active,created_at,updated_at',
        'order' => 'sort_order.asc',
        'fields' => ['item_type', 'garment_id', 'accessory_id', 'provider_name', 'listing_type', 'title', 'address', 'province', 'price_from_vnd', 'price_to_vnd', 'external_url', 'source_url', 'verified_at', 'sort_order', 'is_active'],
    ],
    'locations' => [
        'table' => 'studio_locations',
        'select' => 'id,slug,name,address,province,latitude,longitude,map_url,booking_url,description,image_url,suitable_contexts,source_url,sort_order,is_active,created_at,updated_at',
        'order' => 'sort_order.asc',
        'fields' => ['slug', 'name', 'address', 'province', 'latitude', 'longitude', 'map_url', 'booking_url', 'description', 'image_url', 'suitable_contexts', 'source_url', 'sort_order', 'is_active'],
    ],
    'options' => [
        'table' => 'studio_options',
        'select' => 'id,option_type,slug,label,value,prompt_hint,description,thumbnail_url,source_url,sort_order,is_active',
        'order' => 'option_type.asc,sort_order.asc',
        'fields' => ['option_type', 'slug', 'label', 'value', 'prompt_hint', 'description', 'thumbnail_url', 'source_url', 'sort_order', 'is_active'],
    ],
    'branches' => [
        'table' => 'experience_branches',
        'select' => 'id,page_slug,branch_key,studio_event_slug,label,forward_guard,reverse_guard,forward_media_url,reverse_media_url,thumbnail_url,is_base,sort_order,is_active,updated_at',
        'order' => 'sort_order.asc',
        'fields' => ['page_slug', 'branch_key', 'studio_event_slug', 'label', 'forward_guard', 'reverse_guard', 'forward_media_url', 'reverse_media_url', 'thumbnail_url', 'is_base', 'sort_order', 'is_active'],
    ],
    'sources' => [
        'table' => 'cultural_sources',
        'select' => 'id,title,source_url,license,curator_note,review_status,created_at,updated_at',
        'order' => 'updated_at.desc',
        'fields' => ['title', 'source_url', 'license', 'curator_note', 'review_status'],
    ],
    'prompts' => [
        'table' => 'studio_prompt_versions',
        'select' => 'id,slug,version,model,system_prompt,eval_notes,is_active,created_at',
        'order' => 'slug.asc,version.desc',
        'fields' => ['slug', 'version', 'model', 'system_prompt', 'eval_notes', 'is_active'],
    ],
    'pages' => [
        'table' => 'pages',
        'select' => 'id,slug,name,brand_mark,brand_name,title,description,hero_line_one,hero_line_two,hero_description_one,hero_description_two,controller_label,cta_label,ui,media_url,updated_at',
        'order' => 'slug.asc',
        'fields' => ['name', 'brand_mark', 'brand_name', 'title', 'description', 'hero_line_one', 'hero_line_two', 'hero_description_one', 'hero_description_two', 'controller_label', 'cta_label', 'ui', 'media_url'],
        'no_create' => true,
        'no_delete' => true,
    ],
    'users' => [
        'table' => 'profiles',
        'select' => 'id,email,display_name,avatar_url,created_at,updated_at',
        'order' => 'created_at.desc',
        'fields' => ['display_name', 'avatar_url'],
        'no_create' => true,
        'no_delete' => true,
    ],
    'roles' => [
        'table' => 'user_roles',
        'select' => 'id,user_id,role,created_at',
        'order' => 'created_at.desc',
        'fields' => ['user_id', 'role'],
    ],
    'jobs' => [
        'table' => 'generation_jobs',
        'select' => 'id,client_request_id,provider,cost_source,status,input,output,estimated_cost_vnd,image_count,video_count,error_message,created_at,updated_at,completed_at',
        'order' => 'created_at.desc',
        'fields' => [],
        'readonly' => true,
    ],
    'rules' => [
        'table' => 'cultural_rules',
        'select' => 'id,garment_id,rule_text,severity,context,review_status,is_active,created_at,updated_at',
        'order' => 'updated_at.desc',
        'fields' => ['garment_id', 'rule_text', 'severity', 'context', 'review_status', 'is_active'],
    ],
    'looks' => [
        'table' => 'looks',
        'select' => 'id,name,occasion_slug,garment_slug,color_slug,pattern_slug,style_slug,scene_slug,selection,locks,image_url,visibility,created_at,updated_at',
        'order' => 'created_at.desc',
        'fields' => ['name', 'visibility'],
        'readonly' => true,
    ],
    'discovery' => [
        'table' => 'discovery_looks',
        'select' => 'id,look_id,status,moderation_note,reviewed_at,created_at',
        'order' => 'created_at.desc',
        'fields' => ['status', 'moderation_note'],
    ],
];

$resourceKey = (string) ($_GET['resource'] ?? '');
$resource = $resources[$resourceKey] ?? null;
if (!is_array($resource)) {
    $respond(['error' => 'Resource quản trị không hợp lệ.'], 404);
}

try {
    $client = new SupabaseAdminClient($supabaseUrl, $serviceRoleKey);

    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        $query = [
            'select' => (string) $resource['select'],
            'order' => (string) $resource['order'],
        ];
        if ($resourceKey === 'jobs') {
            $query['limit'] = '100';
        }
        $rows = $client->select((string) $resource['table'], $query);
        $usage = null;
        if ($resourceKey === 'ai-settings') {
            foreach ($rows as &$row) {
                $row['gemini_api_key_configured'] = !empty($row['encrypted_gemini_api_key']);
                $row['secret_source'] = $row['gemini_api_key_configured']
                    ? 'admin-managed'
                    : 'edge-secret-fallback';
                unset($row['encrypted_gemini_api_key']);
            }
            unset($row);

            // Server aggregate avoids silently truncating usage after 1,000 jobs.
            $usage = $client->rpc('studio_usage_summary', []);
        }
        $respond(['resource' => $resourceKey, 'items' => $rows, 'count' => count($rows), 'usage' => $usage]);
    }

    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        $respond(['error' => 'Method không được hỗ trợ.'], 405);
    }

    $input = json_decode((string) file_get_contents('php://input'), true, 512, JSON_THROW_ON_ERROR);
    if (!is_array($input)) {
        $respond(['error' => 'Payload không hợp lệ.'], 400);
    }
    $action = (string) ($input['action'] ?? '');

    if ($action === 'save') {
        if (!empty($resource['readonly'])) {
            $respond(['error' => 'Resource này chỉ cho phép xem.'], 403);
        }
        $record = $input['record'] ?? null;
        if (!is_array($record)) {
            $respond(['error' => 'Bản ghi không hợp lệ.'], 400);
        }

        $id = (string) ($record['id'] ?? '');
        $payload = [];
        foreach ($resource['fields'] as $field) {
            if (!array_key_exists($field, $record)) {
                continue;
            }
            $value = $record[$field];
            if (is_string($value)) {
                $value = trim($value);
                if (in_array($field, ['image_url', 'thumbnail_url', 'source_url', 'license', 'reverse_media_url', 'source_id', 'studio_event_slug', 'garment_id', 'accessory_id', 'booking_url', 'verified_at', 'source_external_id'], true) && $value === '') {
                    $value = null;
                }
                if (mb_strlen($value ?? '') > 30000) {
                    $respond(['error' => 'Nội dung trường ' . $field . ' quá dài.'], 422);
                }
            }
            if (is_array($value) && !in_array($field, ['ui', 'frame_plan', 'preset', 'allowed_contexts', 'default_colors', 'color_palette', 'compatibility', 'suitable_contexts'], true)) {
                $respond(['error' => 'Kiểu dữ liệu trường ' . $field . ' không hợp lệ.'], 422);
            }
            $payload[$field] = $value;
        }
        if (in_array($resourceKey, ['garment-variants', 'accessory-variants'], true)) {
            foreach (['slug', 'name'] as $requiredField) {
                if (trim((string) ($payload[$requiredField] ?? '')) === '') {
                    $respond(['error' => 'Mẫu catalog cần có slug và tên hiển thị.'], 422);
                }
            }
            $parentField = $resourceKey === 'garment-variants' ? 'garment_id' : 'accessory_id';
            if (!is_string($payload[$parentField] ?? null) || preg_match('/^[0-9a-f-]{36}$/i', $payload[$parentField]) !== 1) {
                $respond(['error' => 'Mẫu catalog cần liên kết đúng một loại cha hợp lệ.'], 422);
            }
            if (!in_array($payload['review_status'] ?? '', ['draft', 'reviewed', 'published'], true)) {
                $respond(['error' => 'Trạng thái duyệt mẫu không hợp lệ.'], 422);
            }
            if (!in_array($payload['source_provider'] ?? 'curated', ['curated', 'wikimedia', 'partner'], true)) {
                $respond(['error' => 'Nguồn mẫu không hợp lệ.'], 422);
            }
            foreach (['color_palette'] as $paletteField) {
                if (!is_array($payload[$paletteField] ?? null)) {
                    $respond(['error' => 'Bảng màu của mẫu phải là một JSON array.'], 422);
                }
            }
            $payload['is_active'] = (bool) ($payload['is_active'] ?? false);
            $payload['updated_at'] = gmdate(DATE_ATOM);
        }
        if ($resourceKey === 'ai-settings') {
            if (!in_array($payload['image_provider'] ?? '', ['env', 'gemini', 'vertex', 'webapi'], true)) {
                $respond(['error' => 'Provider tạo ảnh không hợp lệ.'], 422);
            }
            if (!in_array($payload['video_provider'] ?? '', ['env', 'gemini', 'vertex'], true)) {
                $respond(['error' => 'Provider tạo video không hợp lệ.'], 422);
            }
            foreach (['text_model', 'image_model', 'video_model'] as $modelField) {
                if (!is_string($payload[$modelField] ?? null) || $payload[$modelField] === '' || mb_strlen($payload[$modelField]) > 200) {
                    $respond(['error' => 'Tên model AI không hợp lệ.'], 422);
                }
            }
            $variantCount = filter_var($payload['image_variants'] ?? null, FILTER_VALIDATE_INT);
            if ($variantCount === false || $variantCount < 1 || $variantCount > 5) {
                $respond(['error' => 'Số frame ảnh phải từ 1 đến 5 (A + B/C/D/E).'], 422);
            }
            $payload['image_variants'] = $variantCount;
            foreach (['image_unit_cost_vnd', 'video_unit_cost_vnd', 'daily_budget_vnd', 'monthly_budget_vnd'] as $moneyField) {
                if (!is_int($payload[$moneyField] ?? null) && !is_float($payload[$moneyField] ?? null)) {
                    $respond(['error' => 'Đơn giá và ngân sách phải là số.'], 422);
                }
                if ($payload[$moneyField] < 0 || $payload[$moneyField] > 999999999999.99) {
                    $respond(['error' => 'Đơn giá và ngân sách phải lớn hơn hoặc bằng 0.'], 422);
                }
            }
            $payload['generation_enabled'] = (bool) ($payload['generation_enabled'] ?? false);
            $apiKey = trim((string) ($record['gemini_api_key'] ?? ''));
            if ($apiKey !== '') {
                if (strlen($apiKey) < 20 || strlen($apiKey) > 500) {
                    $respond(['error' => 'Gemini API key không đúng độ dài hợp lệ.'], 422);
                }
                $encryptionKey = base64_decode((string) getenv('AI_CONFIG_ENCRYPTION_KEY'), true);
                if (!is_string($encryptionKey) || strlen($encryptionKey) !== 32) {
                    $respond(['error' => 'AI_CONFIG_ENCRYPTION_KEY chưa được cấu hình đúng trên server.'], 503);
                }
                $iv = random_bytes(12);
                $tag = '';
                $ciphertext = openssl_encrypt($apiKey, 'aes-256-gcm', $encryptionKey, OPENSSL_RAW_DATA, $iv, $tag);
                if (!is_string($ciphertext)) {
                    $respond(['error' => 'Không thể mã hoá API key.'], 500);
                }
                $encode = static fn (string $value): string => rtrim(strtr(base64_encode($value), '+/', '-_'), '=');
                $payload['encrypted_gemini_api_key'] = 'v1.' . $encode($iv) . '.' . $encode($tag) . '.' . $encode($ciphertext);
                $payload['gemini_api_key_hint'] = '••••' . substr($apiKey, -4);
            }
            $payload['updated_at'] = gmdate(DATE_ATOM);
        }
        if ($resourceKey === 'studio-generation') {
            if (!in_array($payload['canvas_aspect_ratio'] ?? '', ['16:9', '1:1', '9:16'], true)) {
                $respond(['error' => 'Tỉ lệ khung ảnh không hợp lệ.'], 422);
            }
            if (!in_array($payload['target_resolution'] ?? '', ['720', '1080', '2160'], true)) {
                $respond(['error' => 'Chất lượng đầu ra không hợp lệ.'], 422);
            }
            if (!in_array($payload['default_generation_mode'] ?? '', ['text-to-image', 'image-to-image'], true)) {
                $respond(['error' => 'Chế độ tạo ảnh không hợp lệ.'], 422);
            }
            if (!in_array($payload['default_output_type'] ?? '', ['image', 'video', 'both'], true)) {
                $respond(['error' => 'Đầu ra mặc định không hợp lệ.'], 422);
            }
            if (!is_string($payload['base_prompt'] ?? null) || trim($payload['base_prompt']) === '') {
                $respond(['error' => 'Prompt ảnh gốc A không được để trống.'], 422);
            }
            if (!is_array($payload['frame_plan'] ?? null) || count($payload['frame_plan']) !== 5) {
                $respond(['error' => 'Frame plan phải có đúng năm frame A, B, C, D và E.'], 422);
            }
            $frameKeys = [];
            foreach ($payload['frame_plan'] as $frame) {
                if (!is_array($frame)) {
                    $respond(['error' => 'Mỗi frame phải là một object hợp lệ.'], 422);
                }
                $key = strtoupper(trim((string) ($frame['key'] ?? '')));
                if (!in_array($key, ['A', 'B', 'C', 'D', 'E'], true)) {
                    $respond(['error' => 'Frame key chỉ được là A, B, C, D hoặc E.'], 422);
                }
                $frameKeys[] = $key;
                foreach (['label', 'branch_key', 'change_scope', 'prompt_template'] as $requiredFrameField) {
                    if (trim((string) ($frame[$requiredFrameField] ?? '')) === '') {
                        $respond(['error' => 'Frame ' . $key . ' thiếu trường ' . $requiredFrameField . '.'], 422);
                    }
                }
            }
            sort($frameKeys);
            if ($frameKeys !== ['A', 'B', 'C', 'D', 'E']) {
                $respond(['error' => 'Frame plan phải chứa duy nhất A, B, C, D và E.'], 422);
            }
            $payload['updated_at'] = gmdate(DATE_ATOM);
        }
        if ($resourceKey === 'marketplace') {
            if (!in_array($payload['item_type'] ?? '', ['garment', 'accessory'], true)
                || !in_array($payload['listing_type'] ?? '', ['buy', 'rent', 'both'], true)) {
                $respond(['error' => 'Loại catalog hoặc hình thức mua/thuê không hợp lệ.'], 422);
            }
            $hasGarment = is_string($payload['garment_id'] ?? null) && $payload['garment_id'] !== '';
            $hasAccessory = is_string($payload['accessory_id'] ?? null) && $payload['accessory_id'] !== '';
            if (($payload['item_type'] === 'garment' && (!$hasGarment || $hasAccessory))
                || ($payload['item_type'] === 'accessory' && (!$hasAccessory || $hasGarment))) {
                $respond(['error' => 'Hãy liên kết đúng một ID trang phục hoặc phụ kiện theo loại catalog.'], 422);
            }
        }
        if ($resourceKey === 'locations') {
            if (!is_array($payload['suitable_contexts'] ?? null)) {
                $respond(['error' => 'Bối cảnh phù hợp phải là một JSON array.'], 422);
            }
        }
        if ($resourceKey === 'roles') {
            if (!in_array($payload['role'] ?? '', ['member', 'admin', 'editor', 'cultural_reviewer', 'partner'], true)) {
                $respond(['error' => 'Role người dùng không hợp lệ.'], 422);
            }
            if (!is_string($payload['user_id'] ?? null) || preg_match('/^[0-9a-f-]{36}$/i', $payload['user_id']) !== 1) {
                $respond(['error' => 'User ID không hợp lệ.'], 422);
            }
        }
        if ($payload === []) {
            $respond(['error' => 'Không có dữ liệu để lưu.'], 422);
        }

        if ($resourceKey === 'pages' && isset($payload['ui'])) {
            // Dedicated editor owns website settings; raw UI-copy edits cannot overwrite them.
            if (!is_array($payload['ui'])) $respond(['error' => 'UI copy cần là JSON object.'], 422);
            $currentPage = $client->select('pages', ['id' => 'eq.' . $id, 'select' => 'ui,updated_at', 'limit' => '1']);
            if (!$currentPage) $respond(['error' => 'Không tìm thấy trang.'], 404);
            unset($payload['ui']['website']);
            if (isset($currentPage[0]['ui']['website'])) $payload['ui']['website'] = $currentPage[0]['ui']['website'];
            $pageRevision = $currentPage[0]['updated_at'];
        }
        if ($resourceKey === 'prompts' && !empty($payload['is_active']) && !empty($payload['slug'])) {
            $client->update('studio_prompt_versions', [
                'slug' => 'eq.' . (string) $payload['slug'],
                'is_active' => 'eq.true',
            ], ['is_active' => false]);
        }
        if ($resourceKey === 'branches' && !empty($payload['is_base']) && !empty($payload['page_slug'])) {
            $client->update('experience_branches', [
                'page_slug' => 'eq.' . (string) $payload['page_slug'],
                'is_base' => 'eq.true',
            ], ['is_base' => false]);
        }

        if (in_array($resourceKey, ['ai-settings', 'studio-generation'], true)) {
            $saved = $client->update((string) $resource['table'], ['id' => 'eq.1'], $payload);
        } elseif ($id !== '') {
            if (!preg_match('/^[0-9a-f-]{36}$/i', $id)) {
                $respond(['error' => 'ID bản ghi không hợp lệ.'], 422);
            }
            if ($resourceKey === 'roles' && ($payload['role'] ?? '') !== 'admin') {
                $currentRole = $client->select('user_roles', [
                    'id' => 'eq.' . $id,
                    'select' => 'role',
                    'limit' => '1',
                ]);
                if (($currentRole[0]['role'] ?? '') === 'admin') {
                    $admins = $client->select('user_roles', [
                        'role' => 'eq.admin',
                        'select' => 'id',
                        'limit' => '2',
                    ]);
                    if (count($admins) < 2) {
                        $respond(['error' => 'Không thể hạ quyền Admin cuối cùng.'], 422);
                    }
                }
            }
            $filters = ['id' => 'eq.' . $id];
            if (isset($pageRevision)) $filters['updated_at'] = 'eq.' . $pageRevision;
            $saved = $client->update((string) $resource['table'], $filters, $payload);
            if (isset($pageRevision) && !$saved) $respond(['error' => 'Trang vừa được sửa ở nơi khác. Làm mới trước khi lưu.'], 409);
        } else {
            if (!empty($resource['no_create'])) {
                $respond(['error' => 'Resource này không cho phép tạo mới.'], 403);
            }
            $saved = $client->insert((string) $resource['table'], $payload);
        }
        $savedItem = $saved[0] ?? null;
        if ($resourceKey === 'pages') {
            require_once __DIR__ . '/src/Infrastructure/WebsiteSettings.php';
            $websiteDb = require __DIR__ . '/config/database.php';
            App\Infrastructure\WebsiteSettings::invalidate($websiteDb['cache_file']);
        }
        if ($resourceKey === 'ai-settings' && is_array($savedItem)) {
            unset($savedItem['encrypted_gemini_api_key']);
            $savedItem['gemini_api_key_configured'] = isset($payload['encrypted_gemini_api_key'])
                || !empty($record['gemini_api_key_configured']);
        }
        $respond(['item' => $savedItem, 'message' => 'Đã lưu thay đổi vào Supabase.']);
    }

    if ($action === 'delete') {
        if (!empty($resource['readonly']) || !empty($resource['no_delete'])) {
            $respond(['error' => 'Resource này không cho phép xoá.'], 403);
        }
        $id = (string) ($input['id'] ?? '');
        if (!preg_match('/^[0-9a-f-]{36}$/i', $id)) {
            $respond(['error' => 'ID bản ghi không hợp lệ.'], 422);
        }
        if ($resourceKey === 'roles') {
            $currentRole = $client->select('user_roles', [
                'id' => 'eq.' . $id,
                'select' => 'role',
                'limit' => '1',
            ]);
            if (($currentRole[0]['role'] ?? '') === 'admin') {
                $admins = $client->select('user_roles', [
                    'role' => 'eq.admin',
                    'select' => 'id',
                    'limit' => '2',
                ]);
                if (count($admins) < 2) {
                    $respond(['error' => 'Không thể xoá quyền Admin cuối cùng.'], 422);
                }
            }
        }
        $client->delete((string) $resource['table'], ['id' => 'eq.' . $id]);
        $respond(['message' => 'Đã xoá bản ghi khỏi Supabase.']);
    }

    $respond(['error' => 'Action không hợp lệ.'], 400);
} catch (Throwable $error) {
    error_log('[V-Remix] Admin API: ' . $error->getMessage());
    $respond(['error' => $error->getMessage()], 502);
}
