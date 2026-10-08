const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync('assets/js/studio-collection-store.js','utf8');
const clone = v => JSON.parse(JSON.stringify(v));
const storage = () => { const data = new Map(); return { data, getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,v),removeItem:k=>data.delete(k) }; };
const row = (id,event,revision=1) => ({id,name:event,revision,record:{draft:{event},guideStep:'event'}});
function fixture(server,local=storage(),session=storage()) {
  const calls=[],events=[];let reloads=0;
  const window={VREMIX_STUDIO:{collectionEndpoint:'/collections',auth:{authenticated:true,userId:'account'},lookCsrf:'csrf'},VRemixSession:{readGuest:async()=>null}};
  const context={window,localStorage:local,sessionStorage:session,crypto:{randomUUID:()=> 'copy-'+Math.random()},Date,
    setTimeout:()=>1,clearTimeout(){},location:{reload(){reloads++;}},
    CustomEvent:class{constructor(type,options){this.type=type;this.detail=options.detail;}},
    document:{addEventListener(){},dispatchEvent:e=>events.push(e)},
    fetch:async(url,options)=>{
      assert.equal(options.headers['X-VRemix-Account'],'account'); calls.push(options);
      if(server.fail) throw Error('offline');
      if(!options.body) return {ok:true,json:async()=>({items:clone(server.rows.filter(r=>!r.deleted)),hasAny:server.rows.length>0,deletedIds:server.rows.filter(r=>r.deleted).map(r=>r.id)})};
      const body=JSON.parse(options.body);
      if(server.gate) {const gate=server.gate;server.gate=null;await gate;}
      if(body.action==='hideVersion') {
        const r=server.rows.find(r=>r.id===body.collectionId); r.revision++; r.record.jobId=null;
        return {ok:true,json:async()=>({item:clone(r)})};
      }
      const items=body.items;
      if(items.some(item=>{const r=server.rows.find(r=>r.id===item.id);return r?(r.deleted||r.revision!==item.revision):item.revision!==0;}))
        return {ok:false,status:409,json:async()=>({error:'newer collection'})};
      const result=items.map(item=>{
        let r=server.rows.find(r=>r.id===item.id);
        if(r) Object.assign(r,item,{revision:r.revision+1});else {r={...item,revision:1};server.rows.push(r);}
        return {id:r.id,revision:r.revision,deleted:r.deleted};
      });
      return {ok:true,json:async()=>({items:result})};
    }};
  vm.runInNewContext(source,context);
  return {api:window.VRemixSession,calls,events,local,session,get reloads(){return reloads;}};
}
async function main() {
  const server={rows:[row('a','school'),row('b','ceremony')]};
  const first=fixture(server),second=fixture(server);
  const a=await first.api.read(),b=await second.api.read();
  assert.equal(first.calls.length,1,'opening only reads');
  await first.api.save(a);await first.api.flush();
  assert.equal(first.calls.length,1,'identical restore does not bump revisions');
  await first.api.save({...a,collectionId:'new-blank'});await first.api.flush();
  assert.equal(first.calls.length,1,'new blank does not create collection or delete old ones');
  a.collections[0].record.draft.event='street';await first.api.save(a);await first.api.flush();
  b.collections[1].record.draft.event='beach';await second.api.save(b);await second.api.flush();
  assert.equal(server.rows[0].record.draft.event,'street');assert.equal(server.rows[1].record.draft.event,'beach','different collections do not conflict');
  assert.equal((await first.api.getCollection('b')).record.draft.event,'beach','opening another collection fetches its latest state');
  b.collections[0].record.draft.event='stale';await second.api.save(b);
  await assert.rejects(second.api.flush(),/newer collection/);
  assert.equal(second.api.status().state,'conflict');assert.equal(server.rows[0].record.draft.event,'street');
  await second.api.forkLocal();assert.equal(second.reloads,1);
  assert.ok(server.rows.some(r=>r.id.startsWith('copy-')&&r.record.draft.event==='stale'),'conflict copy preserves local choices');
  const third=fixture(server),record=await third.api.read();
  record.collections[0].deleted=true;await third.api.save(record);await third.api.flush();
  const afterDelete=await fixture(server).api.read();assert.ok(!afterDelete.collections.some(r=>r.id==='a'),'deleted IDs do not return');
  const sameTabAfterDelete=await fixture(server,third.local,third.session).api.read();
  assert.notEqual(sameTabAfterDelete.collectionId,'a','a remote-deleted active ID must not be reused for a new blank collection');
  const offlineServer={rows:[row('x','school')]},offline=fixture(offlineServer);
  const draft=await offline.api.read();draft.collections[0].record.draft.event='offline-change';offlineServer.fail=true;
  await offline.api.save(draft);await assert.rejects(offline.api.flush(),/offline/);
  assert.ok([...offline.local.data.keys()].some(k=>k.includes('.recovery.')),'failed save keeps dirty recovery');
  offlineServer.fail=false;await offline.api.retry();assert.equal(offlineServer.rows[0].record.draft.event,'offline-change');
  // New choices while a request is pending must survive and use the acknowledged revision.
  let release;offlineServer.gate=new Promise(resolve=>release=resolve);
  draft.collections[0].record.draft.event='first-write';await offline.api.save(draft);const saving=offline.api.flush();
  await new Promise(resolve=>setImmediate(resolve));
  draft.collections[0].record.draft.event='during-write';await offline.api.save(draft);release();await saving;
  assert.equal(offlineServer.rows[0].record.draft.event,'during-write');
  assert.equal(offline.api.status().state,'saved');
  const emptyServer={rows:[]},sharedLocal=storage(),tabA=fixture(emptyServer,sharedLocal),tabB=fixture(emptyServer,sharedLocal);
  const blankA=await tabA.api.read(),blankB=await tabB.api.read();
  await tabA.api.save({...blankA,collections:[row('tab-a','school',0)]});
  await tabB.api.save({...blankB,collections:[row('tab-b','ceremony',0)]});
  assert.equal([...sharedLocal.data.keys()].filter(k=>k.includes('.recovery.')).length,2,'tabs have independent recovery records');
  console.log('Collection store: read/no-op safety, independent revisions, conflict copies, tombstones, offline recovery, in-flight changes and per-tab isolation passed.');
}
main().catch(e=>{console.error(e);process.exitCode=1;});
