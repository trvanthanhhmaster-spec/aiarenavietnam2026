<?php
declare(strict_types=1);
namespace App\Repositories;

use App\Support\FashionNetwork;
use App\Infrastructure\SupabaseAdminClient;
use App\Infrastructure\SupabaseClient;

final class FashionRepository
{
    public function __construct(private SupabaseClient|SupabaseAdminClient $client) {}

    public function garments(): array
    {
        return $this->client->select('studio_garments',['select'=>'id,name','is_active'=>'eq.true','order'=>'sort_order.asc','limit'=>'100']);
    }
    public function directory(string $query, string $province, int $page): array
    {
        $filters = ['select'=>'id,name,description,province,address,contact_url,website_url,verified_at','status'=>'eq.published','order'=>'name.asc,id.asc','limit'=>'21','offset'=>(string)(max(0,$page-1)*20)];
        // Search text never becomes a PostgREST boolean/filter expression.
        $query = trim(preg_replace('/[^\p{L}\p{N} \-]/u','',mb_substr($query,0,100)) ?? '');
        if ($query!=='') $filters['name']='ilike.*'.$query.'*';
        if ($province!=='') $filters['province']='eq.'.mb_substr($province,0,120);
        return $this->client->select('fashion_shops',$filters);
    }
    public function shop(string $id, string $garment = ''): array
    {
        $shops=$this->client->select('fashion_shops',['select'=>'id,name,description,province,address,contact_url,website_url,verified_at','id'=>'eq.'.FashionNetwork::uuid($id),'status'=>'eq.published','limit'=>'1']);
        if (!$shops) return ['shops'=>[],'products'=>[]];
        $filter=['select'=>'id,shop_id,garment_id,name,description,source_url,verified_at','shop_id'=>'eq.'.$id,'status'=>'eq.published','order'=>'name.asc,id.asc','limit'=>'100'];
        if ($garment!=='') $filter['garment_id']='eq.'.FashionNetwork::uuid($garment);
        return ['shops'=>$shops]+$this->children($this->client->select('fashion_products',$filter),false);
    }
    public function workspace(string $userId, bool $admin, string $shopId = '', int $page = 1): array
    {
        if (!$this->client instanceof SupabaseAdminClient) throw new \LogicException('Private workspace requires service transport.');
        $filter=['select'=>'*','order'=>'created_at.desc,id.asc','limit'=>$admin?'11':'3'];
        if ($admin) $filter['offset']=(string)(max(0,$page-1)*10);
        if (!$admin) {
            $members=$this->client->select('fashion_shop_members',['select'=>'shop_id','user_id'=>'eq.'.FashionNetwork::uuid($userId),'limit'=>'3']);
            if (!$members) return ['shops'=>[],'products'=>[],'variants'=>[],'media'=>[],'offers'=>[]];
            $filter['id']='in.('.implode(',',array_column($members,'shop_id')).')';
        }
        $shops=$this->client->select('fashion_shops',$filter);
        $hasNext=$admin&&count($shops)>10;
        if ($admin) $shops=array_slice($shops,0,10);
        $ids=array_column($shops,'id');
        if ($shopId!=='' && in_array($shopId,$ids,true)) $ids=[$shopId];
        if (!$ids) return ['shops'=>$shops,'products'=>[],'variants'=>[],'media'=>[],'offers'=>[],'has_next'=>$hasNext];
        $products=$this->client->select('fashion_products',['select'=>'*','shop_id'=>'in.('.implode(',',$ids).')','order'=>'updated_at.desc,id.asc','limit'=>'1000']);
        return ['shops'=>$shops,'has_next'=>$hasNext]+$this->children($products,true);
    }
    private function children(array $products, bool $private): array
    {
        $result=['products'=>$products,'variants'=>[],'media'=>[],'offers'=>[]];
        if (!$products) return $result;
        // Bounded batches avoid excessively long request URLs for larger networks.
        foreach (array_chunk(array_column($products,'id'),50) as $ids) {
            foreach (['variants'=>'fashion_product_variants','media'=>'fashion_product_media','offers'=>'fashion_product_offers'] as $key=>$table) {
                $select=$key==='media'&&!$private?'id,product_id,image_url,display_permission,ai_permission':'*';
                $result[$key]=array_merge($result[$key],$this->client->select($table,['select'=>$select,'product_id'=>'in.('.implode(',',$ids).')','order'=>'id.asc','limit'=>'1000']));
            }
        }
        return $result;
    }
    public function submitShop(string $actor, string $id, int $revision, array $data): array
    {
        return $this->client->rpc('fashion_submit_shop',['actor'=>$actor,'entity'=>$id,'expected'=>$revision,'data'=>FashionNetwork::shop($data)]);
    }
    public function submitProduct(string $actor,string $shop,string $id,int $revision,array $data): array
    {
        return $this->client->rpc('fashion_submit_product',['actor'=>$actor,'shop'=>FashionNetwork::uuid($shop),'entity'=>$id,'expected'=>$revision,'data'=>FashionNetwork::product($data)]);
    }
    public function review(string $actor,array $data): array
    {
        $kind=FashionNetwork::text($data,'kind',10,1); $decision=FashionNetwork::text($data,'decision',20,1);
        if (!in_array($kind,['shop','product'],true)||!in_array($decision,['published','rejected','archived'],true)) throw new \InvalidArgumentException('Thao tác duyệt không hợp lệ.');
        return $this->client->rpc('fashion_review',['actor'=>$actor,'kind'=>$kind,'entity'=>FashionNetwork::uuid(FashionNetwork::text($data,'id',36,36)),
            'expected'=>FashionNetwork::revision($data['revision']??null),'decision'=>$decision,'note'=>FashionNetwork::text($data,'note',2000),'allow_ai'=>($data['allow_ai']??'')==='yes']);
    }
}
