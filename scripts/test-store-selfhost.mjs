import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const base=process.env.TEST_BASE_URL||'http://127.0.0.1:3101';
const origin=new URL(base).origin;
const password=(await readFile(new URL('../.deploy/admin-password',import.meta.url),'utf8')).trim();
let cookie='';

async function request(action,{method='GET',body,auth=true}={}){
  const headers={Origin:origin};
  if(auth&&cookie)headers.Cookie=cookie;
  if(body!==undefined&&!(body instanceof FormData))headers['Content-Type']='application/json';
  const response=await fetch(`${base}/api/store?action=${action}`,{method,headers,body:body instanceof FormData?body:body===undefined?undefined:JSON.stringify(body)});
  return {response,data:response.headers.get('content-type')?.includes('application/json')?await response.json():await response.arrayBuffer()};
}

let result=await request('wallet',{method:'POST',body:{wallet:''},auth:false});
assert.equal(result.response.status,403);

result=await request('login',{method:'POST',body:{password:'wrong-password'},auth:false});
assert.equal(result.response.status,401);

result=await request('login',{method:'POST',body:{password},auth:false});
assert.equal(result.response.status,200);
const setCookie=result.response.headers.get('set-cookie');
assert.ok(setCookie?.startsWith('vf_admin='));
cookie=setCookie.split(';',1)[0];

result=await request('wallet',{method:'POST',body:{wallet:'0x123'}});
assert.equal(result.response.status,400);

async function upload(kind,name,type,contents){
  const form=new FormData();
  form.set('kind',kind);
  form.set('file',new File([contents],name,{type}));
  const uploaded=await request('upload',{method:'POST',body:form});
  assert.equal(uploaded.response.status,200);
  return uploaded.data;
}

const png=Uint8Array.from([137,80,78,71,13,10,26,10]);
const paidPreview=await upload('preview','paid.png','image/png',png);
const paidFile=await upload('download','paid.zip','application/zip','paid-download');
result=await request('save',{method:'POST',body:{title:'Paid test product',description:'Checkout test',category:'Templates',price:1250,preview:paidPreview.key,preview_content_type:paidPreview.type,media_type:'image',file:paidFile.key,filename:paidFile.name}});
assert.equal(result.response.status,200);
const paidId=result.data.id;

result=await request(`media&id=${paidId}`,{auth:false});
assert.equal(result.response.status,200);
assert.equal(result.response.headers.get('content-type'),'image/png');

result=await request(`download&id=${paidId}`,{auth:false});
assert.equal(result.response.status,403);

result=await request('checkout',{method:'POST',body:{id:paidId},auth:false});
assert.equal(result.response.status,409);

const wallet='0x1111111111111111111111111111111111111111';
result=await request('wallet',{method:'POST',body:{wallet}});
assert.equal(result.response.status,200);

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

result=await request('review',{method:'POST',body:{id:order.id,status:'approved'},auth:false});
assert.equal(result.response.status,403);
result=await request(`download&id=${paidId}&token=${order.token}`,{auth:false});
assert.equal(result.response.status,403);

result=await request('review',{method:'POST',body:{id:order.id,status:'approved'}});
assert.equal(result.response.status,200);
result=await request(`download&id=${paidId}&token=${order.token}`,{auth:false});
assert.equal(result.response.status,200);
assert.equal(Buffer.from(result.data).toString(),'paid-download');

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

for(const id of [paidId,freeId]){
  result=await request('archive',{method:'POST',body:{id}});
  assert.equal(result.response.status,200);
}
await request('wallet',{method:'POST',body:{wallet:''}});
result=await request('logout',{method:'POST',body:{}});
assert.equal(result.response.status,200);

console.log('Self-hosted store API checkout, upload, access control and review flow passed.');
