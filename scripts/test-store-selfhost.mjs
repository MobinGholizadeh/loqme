import assert from 'node:assert/strict';

const base=process.env.TEST_BASE_URL||'http://127.0.0.1:3101';
const origin=new URL(base).origin;
assert.equal(process.env.TEST_ALLOW_WRITES,'1','Run npm run test:php for an isolated disposable store.');
assert.ok(['127.0.0.1','localhost','[::1]'].includes(new URL(base).hostname),'Tests must use a local disposable server.');
const password=process.env.TEST_ADMIN_PASSWORD;
assert.ok(password,'TEST_ADMIN_PASSWORD is required.');
let cookie='';

async function request(action,{method='GET',body,auth=true}={}){
  const headers={Origin:origin};
  if(auth&&cookie)headers.Cookie=cookie;
  if(body!==undefined&&!(body instanceof FormData))headers['Content-Type']='application/json';
  const response=await fetch(`${base}/api/store.php?action=${action}`,{method,headers,body:body instanceof FormData?body:body===undefined?undefined:JSON.stringify(body)});
  return {response,data:response.headers.get('content-type')?.includes('application/json')?await response.json():await response.arrayBuffer()};
}

let result=await request('wallet',{method:'POST',body:{wallet:''},auth:false});
assert.equal(result.response.status,403);

for(const path of ['/','/order?id=old-order&token=private','/order/','/favicon.svg','/api/health','/api/health.php']){
  const response=await fetch(base+path);
  assert.equal(response.status,200,path);
  if(path.startsWith('/order'))assert.equal(response.redirected,false,'Private order links must not be redirected through HTTP behind a TLS proxy');
  if(path.startsWith('/order'))assert.match(await response.text(),/id="root"/);
}
for(const path of ['/api/_lib/bootstrap.php','/.user.ini','/.htaccess','/voidframe-data/store.json','/api/store.json','/not-found.js']){
  const response=await fetch(base+path);
  assert.ok([403,404].includes(response.status),`${path} must not be public`);
}
assert.equal((await fetch(`${base}/api/store`)).status,200,'Old API links remain supported');
assert.equal((await fetch(`${base}/api/store.php?action=unknown`)).status,400);
assert.equal((await fetch(`${base}/api/store.php`,{method:'DELETE'})).status,405);

result=await request('login',{method:'POST',body:{password:'wrong-password'},auth:false});
assert.equal(result.response.status,401);

result=await request('login',{method:'POST',body:{password},auth:false});
assert.equal(result.response.status,200);
const setCookie=result.response.headers.get('set-cookie');
assert.ok(setCookie?.startsWith('vf_admin='));
assert.match(setCookie,/HttpOnly/i);
assert.match(setCookie,/SameSite=Strict/i);
cookie=setCookie.split(';',1)[0];

let response=await fetch(`${base}/api/store.php?action=wallet`,{method:'POST',headers:{Origin:'https://attacker.invalid',Cookie:cookie,'Content-Type':'application/json'},body:JSON.stringify({wallet:''})});
assert.equal(response.status,403,'Cross-origin mutations must be rejected');
response=await fetch(`${base}/api/store.php?action=wallet`,{method:'POST',headers:{Origin:origin,Cookie:cookie,'Content-Type':'application/json'},body:'{invalid'});
assert.equal(response.status,400,'Malformed JSON must not mutate the store');
response=await fetch(`${base}/api/store.php?action=studio`,{headers:{Cookie:cookie+'tampered'}});
assert.equal((await response.json()).admin,false,'Tampered sessions must be rejected');

result=await request('wallet',{method:'POST',body:{wallet:'0x123'}});
assert.equal(result.response.status,400);

async function upload(kind,name,type,contents){
  const form=new FormData();
  form.set('kind',kind);
  form.set('file',new File([contents],name,{type}));
  const uploaded=await request('upload',{method:'POST',body:form});
  assert.equal(uploaded.response.status,200,JSON.stringify(uploaded.data));
  return uploaded.data;
}

const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=','base64');
const invalidPreview=new FormData();
invalidPreview.set('kind','preview');
invalidPreview.set('file',new File(['<?php echo "unsafe";'], 'pretend.png',{type:'image/png'}));
result=await request('upload',{method:'POST',body:invalidPreview});
assert.equal(result.response.status,400,'Preview MIME must be checked from file content');
const paidPreview=await upload('preview','paid.png','image/png',png);
const paidFile=await upload('download','paid.zip','application/zip','paid-download');
result=await request('save',{method:'POST',body:{title:'Paid test product',description:'Checkout test',category:'Templates',price:1250,preview:paidPreview.key,preview_content_type:paidPreview.type,media_type:'image',file:paidFile.key,filename:paidFile.name}});
assert.equal(result.response.status,200);
const paidId=result.data.id;

result=await request('',{auth:false});
assert.ok(!('file' in result.data.products.find(p=>p.id===paidId)),'Public catalog must hide private file keys');

result=await request(`media&id=${paidId}`,{auth:false});
assert.equal(result.response.status,200);
assert.equal(result.response.headers.get('content-type'),'image/png');
response=await fetch(`${base}/api/store.php?action=media&id=${paidId}`,{headers:{Range:'bytes=0-7'}});
assert.equal(response.status,206);
assert.equal(response.headers.get('content-range'),`bytes 0-7/${png.length}`);
assert.deepEqual(Buffer.from(await response.arrayBuffer()),png.subarray(0,8));
response=await fetch(`${base}/api/store.php?action=media&id=${paidId}`,{headers:{Range:'bytes=999999-'}});
assert.equal(response.status,416);

result=await request(`download&id=${paidId}`,{auth:false});
assert.equal(result.response.status,403);

result=await request('checkout',{method:'POST',body:{id:paidId},auth:false});
assert.equal(result.response.status,409);

const wallet='0x1111111111111111111111111111111111111111';
result=await request('wallet',{method:'POST',body:{wallet}});
assert.equal(result.response.status,200);

const concurrent=await Promise.all(Array.from({length:8},()=>request('checkout',{method:'POST',body:{id:paidId},auth:false})));
assert.ok(concurrent.every(r=>r.response.status===200));
for(const item of concurrent){
  const saved=await request(`order&id=${item.data.id}&token=${item.data.token}`,{auth:false});
  assert.equal(saved.response.status,200,'Concurrent orders must not overwrite each other');
}

result=await request('checkout',{method:'POST',body:{id:paidId},auth:false});
assert.equal(result.response.status,200);
const order=result.data;
assert.equal(order.wallet,wallet);

result=await request(`order&id=${order.id}&token=bad`,{auth:false});
assert.equal(result.response.status,404);

result=await request('receipt',{method:'POST',body:{id:order.id,token:order.token,tx:'0x123'},auth:false});
assert.equal(result.response.status,400);
const tx=`0x${'ab'.repeat(32)}`;
result=await request('receipt',{method:'POST',body:{id:order.id,token:order.token,tx},auth:false});
assert.equal(result.response.status,200);
result=await request('orders');
assert.ok(result.data.every(o=>!('token' in o)),'Review list must hide private order tokens');

result=await request('review',{method:'POST',body:{id:order.id,status:'approved'},auth:false});
assert.equal(result.response.status,403);
result=await request(`download&id=${paidId}&token=${order.token}`,{auth:false});
assert.equal(result.response.status,403);

result=await request('review',{method:'POST',body:{id:order.id,status:'approved'}});
assert.equal(result.response.status,200);
result=await request(`download&id=${paidId}&token=${order.token}`,{auth:false});
assert.equal(result.response.status,200);
assert.equal(Buffer.from(result.data).toString(),'paid-download');
assert.equal(result.response.headers.get('cache-control'),'private, no-store');
assert.match(result.response.headers.get('content-disposition'),/attachment/);

const secondOrder=await request('checkout',{method:'POST',body:{id:paidId},auth:false});
assert.equal(secondOrder.response.status,200);
result=await request('receipt',{method:'POST',body:{id:secondOrder.data.id,token:secondOrder.data.token,tx},auth:false});
assert.equal(result.response.status,400);

const freePreview=await upload('preview','free.png','image/png',png);
const freeFile=await upload('download','free.txt','text/plain','free-download');
result=await request('save',{method:'POST',body:{title:'Free test product',description:'Free download test',category:'Templates',price:0,preview:freePreview.key,preview_content_type:freePreview.type,media_type:'image',file:freeFile.key,filename:freeFile.name}});
assert.equal(result.response.status,200);
const freeId=result.data.id;
result=await request(`download&id=${freeId}`,{auth:false});
assert.equal(result.response.status,200);
assert.equal(Buffer.from(result.data).toString(),'free-download');

const rejected=await request('checkout',{method:'POST',body:{id:paidId},auth:false});
await request('receipt',{method:'POST',body:{id:rejected.data.id,token:rejected.data.token,tx:`0x${'cd'.repeat(32)}`},auth:false});
result=await request('review',{method:'POST',body:{id:rejected.data.id,status:'rejected'}});
assert.equal(result.response.status,200);
result=await request(`download&id=${paidId}&token=${rejected.data.token}`,{auth:false});
assert.equal(result.response.status,403,'Rejected payments cannot unlock files');

for(const id of [paidId,freeId]){
  result=await request('archive',{method:'POST',body:{id}});
  assert.equal(result.response.status,200);
}
result=await request('',{auth:false});
assert.ok(result.data.products.every(p=>![paidId,freeId].includes(p.id)));
result=await request(`download&id=${paidId}&token=${order.token}`,{auth:false});
assert.equal(result.response.status,200,'Archiving preserves approved purchases');
result=await request('checkout',{method:'POST',body:{id:paidId},auth:false});
assert.equal(result.response.status,400,'Archived products cannot start a new checkout');
await request('wallet',{method:'POST',body:{wallet:''}});
result=await request('logout',{method:'POST',body:{}});
assert.equal(result.response.status,200);
assert.match(result.response.headers.get('set-cookie'),/expires=.*1970/i);
cookie='';
result=await request('studio');
assert.equal(result.data.admin,false);

console.log('PHP store: uploads, private downloads, payment review, concurrent writes, origins, sessions, ranges, archive and static routes passed.');
