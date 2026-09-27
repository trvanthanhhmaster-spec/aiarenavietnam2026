<?php
declare(strict_types=1);

require __DIR__ . '/src/Support/Env.php';
require __DIR__ . '/src/Support/AdminAuth.php';
require __DIR__ . '/src/Infrastructure/SupabaseAdminClient.php';

use App\Infrastructure\SupabaseAdminClient;
use App\Support\AdminAuth;
use App\Support\Env;

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

$respond = static function (mixed $body, int $status = 200): never {
    http_response_code($status);
    echo json_encode($body, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR);
    exit;
};

$auth = new AdminAuth(__DIR__ . '/storage/admin-auth.json');
$auth->boot();
if (!$auth->isAuthenticated()) {
    $respond(['error' => 'Phiên quản trị đã hết hạn.'], 401);
}

$csrf = (string) ($_SERVER['HTTP_X_CSRF_TOKEN'] ?? '');
if (!$auth->verifyCsrf($csrf)) {
    $respond(['error' => 'CSRF token không hợp lệ. Hãy tải lại trang quản trị.'], 403);
}

Env::load(__DIR__ . '/.env');
$supabaseUrl = rtrim((string) getenv('SUPABASE_URL'), '/');
$serviceRoleKey = (string) getenv('SUPABASE_SERVICE_ROLE_KEY');
if ($supabaseUrl === '' || $serviceRoleKey === '') {
    $respond(['error' => 'Thiếu SUPABASE_SERVICE_ROLE_KEY trong cấu hình server.'], 503);
}

$resources = [
    'events' => [
        'table' => 'studio_events',
        'select' => 'id,slug,label,description,cultural_context,sort_order,is_active,created_at,updated_at',
        'order' => 'sort_order.asc',
        'fields' => ['slug', 'label', 'description', 'cultural_context', 'sort_order', 'is_active'],
    ],
    'garments' => [
        'table' => 'studio_garments',
        'select' => 'id,slug,name,category,description,origin_note,significance_note,image_url,source_id,sort_order,is_active,created_at,updated_at',
        'order' => 'sort_order.asc',
        'fields' => ['slug', 'name', 'category', 'description', 'origin_note', 'significance_note', 'image_url', 'source_id', 'sort_order', 'is_active'],
    ],
    'accessories' => [
        'table' => 'studio_accessories',
        'select' => 'id,slug,name,category,description,image_url,sort_order,is_active,created_at,updated_at',
        'order' => 'sort_order.asc',
        'fields' => ['slug', 'name', 'category', 'description', 'image_url', 'sort_order', 'is_active'],
    ],
    'options' => [
        'table' => 'studio_options',
        'select' => 'id,option_type,slug,label,value,prompt_hint,sort_order,is_active',
        'order' => 'option_type.asc,sort_order.asc',
        'fields' => ['option_type', 'slug', 'label', 'value', 'prompt_hint', 'sort_order', 'is_active'],
    ],
    'branches' => [
        'table' => 'experience_branches',
        'select' => 'id,page_slug,branch_key,label,forward_guard,reverse_guard,forward_media_url,reverse_media_url,is_base,sort_order,is_active,updated_at',
        'order' => 'sort_order.asc',
        'fields' => ['page_slug', 'branch_key', 'label', 'forward_guard', 'reverse_guard', 'forward_media_url', 'reverse_media_url', 'is_base', 'sort_order', 'is_active'],
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
    'jobs' => [
        'table' => 'generation_jobs',
        'select' => 'id,client_request_id,status,input,output,error_message,created_at,updated_at,completed_at',
        'order' => 'created_at.desc',
        'fields' => [],
        'readonly' => true,
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
        $respond(['resource' => $resourceKey, 'items' => $rows, 'count' => count($rows)]);
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
                if (in_array($field, ['image_url', 'source_url', 'license', 'reverse_media_url', 'source_id'], true) && $value === '') {
                    $value = null;
                }
                if (mb_strlen($value ?? '') > 30000) {
                    $respond(['error' => 'Nội dung trường ' . $field . ' quá dài.'], 422);
                }
            }
            if (is_array($value) && $field !== 'ui') {
                $respond(['error' => 'Kiểu dữ liệu trường ' . $field . ' không hợp lệ.'], 422);
            }
            $payload[$field] = $value;
        }
        if ($payload === []) {
            $respond(['error' => 'Không có dữ liệu để lưu.'], 422);
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

        if ($id !== '') {
            if (!preg_match('/^[0-9a-f-]{36}$/i', $id)) {
                $respond(['error' => 'ID bản ghi không hợp lệ.'], 422);
            }
            $saved = $client->update((string) $resource['table'], ['id' => 'eq.' . $id], $payload);
        } else {
            if (!empty($resource['no_create'])) {
                $respond(['error' => 'Resource này không cho phép tạo mới.'], 403);
            }
            $saved = $client->insert((string) $resource['table'], $payload);
        }
        $respond(['item' => $saved[0] ?? null, 'message' => 'Đã lưu thay đổi vào Supabase.']);
    }

    if ($action === 'delete') {
        if (!empty($resource['readonly']) || !empty($resource['no_delete'])) {
            $respond(['error' => 'Resource này không cho phép xoá.'], 403);
        }
        $id = (string) ($input['id'] ?? '');
        if (!preg_match('/^[0-9a-f-]{36}$/i', $id)) {
            $respond(['error' => 'ID bản ghi không hợp lệ.'], 422);
        }
        $client->delete((string) $resource['table'], ['id' => 'eq.' . $id]);
        $respond(['message' => 'Đã xoá bản ghi khỏi Supabase.']);
    }

    $respond(['error' => 'Action không hợp lệ.'], 400);
} catch (Throwable $error) {
    error_log('[V-Remix] Admin API: ' . $error->getMessage());
    $respond(['error' => $error->getMessage()], 502);
}
