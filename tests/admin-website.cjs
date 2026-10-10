const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync('assets/js/admin-website.js', 'utf8');
const admin = fs.readFileSync('assets/js/admin.js', 'utf8');
const shell = fs.readFileSync('assets/js/admin-shell.js', 'utf8');
const api = fs.readFileSync('admin-api.php', 'utf8');
assert.match(source, /canLeave:/); assert.match(source, /beforeunload/);
assert.match(source, /state = null; message\(error.message \+ ' Làm mới/);
assert.match(source, /revision:state.revision/); assert.match(source, /fields.disabled = !state/);
assert.match(source, /FormData/); assert.match(source, /X-CSRF-Token/); assert.match(source, /credentials:'same-origin'/);
assert.match(source, /textContent = title/); assert.match(source, /escape\(value\)/);
assert.doesNotMatch(source, /localStorage|sessionStorage|eval\(/);
assert.match(admin, /VRemixWebsite\.canLeave\(\)/); assert.match(shell, /'pages', 'brand', 'seo'/);
assert.ok(api.indexOf("!$auth->isAdmin()") < api.indexOf("['brand', 'seo']"));
assert.ok(api.indexOf('verifyCsrf') < api.indexOf("['brand', 'seo']"));
assert.match(api, /is_uploaded_file/); assert.match(api, /unset\(\$payload\['ui'\]\['website'\]\)/);
async function runBehavior() {
  const data = JSON.parse(require('node:child_process').execFileSync('/Applications/XAMPP/xamppfiles/bin/php', ['-r', "require 'src/Support/WebsiteMetadata.php'; echo json_encode(['settings'=>App\\Support\\WebsiteMetadata::defaults(),'home'=>['title'=>'Home','description'=>'Description'],'revision'=>'v1']);"], {encoding:'utf8'}));
  const nodes = {};
  function node(id) { return nodes[id] ||= {id,hidden:false,disabled:false,value:'home',textContent:'',events:{},classList:{toggle(){}},scrollIntoView(){},addEventListener(key, fn){this.events[key]=fn;}}; }
  let fail = false, delay = null, confirmCount = 0;
  const requests = [], events = {};
  const window = {VREMIX_ADMIN:{endpoint:'admin-api.php',csrf:'test-csrf'},confirm(){confirmCount++;return false;},addEventListener(key, fn){events[key]=fn;}};
  vm.runInNewContext(source, {window,document:{getElementById:node},FormData:class{},fetch:async(url,options)=>{
    requests.push({url,options});
    if (delay) return delay;
    if (fail) throw new Error('uncertain write');
    if (options.method === 'POST') { const body = JSON.parse(options.body); assert.equal(body.revision,'v1'); const key = url.split('=').at(-1); data.settings[key] = body.values; data.revision = 'v2'; }
    return {ok:true,json:async()=>JSON.parse(JSON.stringify(data))};
  }});
  assert.equal(await window.VRemixWebsite.load('seo'),'Đã đồng bộ');
  assert.equal(node('websiteFields').disabled,false);
  node('websiteInputs').events.input({target:{dataset:{setting:'pages.home.title'},type:'text',value:'New title'}});
  assert.equal(node('websitePreviewTitle').textContent,'New title','Live preview follows current field');
  assert.equal(window.VRemixWebsite.canLeave(),false,'Reject dirty navigation'); assert.equal(confirmCount,1);
  node('websiteInputs').events.input({target:{dataset:{setting:'indexable'},type:'checkbox',checked:false}});
  assert.match(node('websiteIndexPreview').textContent,/noindex/);
  await node('websiteForm').events.submit({preventDefault(){}});
  assert.equal(window.VRemixWebsite.canLeave(),true,'Saved state no longer dirty');
  assert.equal(data.settings.seo.pages.home.title,'New title');
  assert.equal(data.settings.brand.name,'V-Remix','SEO does not change brand');
  assert.equal(requests.at(-1).options.headers['X-CSRF-Token'],'test-csrf');
  fail = true;
  node('websiteInputs').events.input({target:{dataset:{setting:'pages.home.title'},type:'text',value:'Uncertain'}});
  await node('websiteForm').events.submit({preventDefault(){}});
  assert.equal(node('websiteFields').disabled,true,'Uncertain write locks fields until fresh read');
  const count = requests.length; await node('websiteForm').events.submit({preventDefault(){}}); assert.equal(requests.length,count,'No replay of uncertain writes');
  fail = false; await window.VRemixWebsite.load('brand');
  assert.equal(node('websiteFields').disabled,false,'Refresh restores authoritative state');
  let resolve; delay = new Promise(r=>{resolve=r;});
  const pending = window.VRemixWebsite.load('seo'); window.VRemixWebsite.leave();
  resolve({ok:true,json:async()=>data}); await pending;
  assert.equal(node('adminWebsiteSettings').hidden,true,'Late response cannot reopen a left panel');
  assert.ok(events.beforeunload);
}
runBehavior().then(()=>console.log('Admin website: CSRF, dirty cancel, live preview/noindex, section isolation, revision, uncertain writes and stale response handling passed offline.')).catch(error=>{console.error(error);process.exitCode=1;});
