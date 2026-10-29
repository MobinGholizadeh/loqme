import {readFile,stat,writeFile} from 'node:fs/promises';
/* eslint-disable @typescript-eslint/no-explicit-any -- Action bodies are validated per operation below. */
import {clearAdminSession,isAdmin,setAdminSession,verifyAdminPassword} from '../../../lib/server-auth';
import {initStore,readStore,storagePath,updateStore,type StoredOrder,type StoredProduct} from '../../../lib/server-store';
export const dynamic='force-dynamic';export const runtime='nodejs';
const json=(data:unknown,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store'}});
const safeKey=(key:string)=>/^[a-f0-9-]{36}$/.test(key);
async function exists(kind:'preview'|'download',key:string){try{await stat(storagePath(kind,key));return true}catch{return false}}
function originOkay(req:Request){
 const origin=req.headers.get('origin');if(!origin)return true;
 try{const host=(req.headers.get('x-forwarded-host')||req.headers.get('host')||'').split(',')[0].trim();return new URL(origin).host===host}catch{return false}
}
export async function GET(req:Request){
 try{const url=new URL(req.url),action=url.searchParams.get('action'),store=await readStore();
 if(action==='studio')return json({admin:await isAdmin(),setup:false,signedIn:await isAdmin()});
 if(action==='orders'){if(!await isAdmin())return json({error:'Owner access required.'},403);return json(store.orders.filter(o=>o.tx).sort((a,b)=>b.created-a.created).map(o=>{const visible:Partial<StoredOrder>={...o};delete visible.token;return visible}))}
 if(action==='order'){const o=store.orders.find(o=>o.id===url.searchParams.get('id')&&o.token===url.searchParams.get('token'));return o?json(o):json({error:'Order not found.'},404)}
 if(action==='media'||action==='download'){
 const p=store.products.find(p=>p.id===url.searchParams.get('id'));if(!p)return json({error:'Product not found.'},404);
 const kind=action==='media'?'preview':'download',key=action==='media'?p.preview:p.file;
 if(!safeKey(key))return json({error:'Invalid file.'},400);
 if(action==='download'&&p.price>0&&!await isAdmin()){const order=store.orders.find(o=>o.product_id===p.id&&o.token===url.searchParams.get('token')&&o.status==='approved');if(!order)return json({error:'Payment must be reviewed before downloading.'},403)}
 const bytes=await readFile(storagePath(kind,key));const headers=new Headers({'X-Content-Type-Options':'nosniff','Cache-Control':action==='download'?'private, no-store':'public, max-age=3600'});
 if(action==='media')headers.set('Content-Type',p.preview_content_type||(p.media_type==='video'?'video/mp4':'image/webp'));else{headers.set('Content-Type','application/octet-stream');headers.set('Content-Disposition',`attachment; filename*=UTF-8''${encodeURIComponent(p.filename)}`)}return new Response(bytes,{headers});
 }
 const products=store.products.filter(p=>!p.archived).sort((a,b)=>b.created-a.created).map(p=>{const visible:Partial<StoredProduct>={...p};delete visible.file;visible.preview=`/api/store?action=media&id=${p.id}`;return visible});return json({products,wallet:store.settings.wallet});
 }catch{return json({error:'Unable to load the store. Please try again.'},500)}
}
export async function POST(req:Request){
 try{if(!originOkay(req))return json({error:'Invalid request origin.'},403);const action=new URL(req.url).searchParams.get('action');
 if(action==='login'){const body=await req.json() as {password?:string};if(!body.password||!verifyAdminPassword(body.password))return json({error:'Incorrect owner password.'},401);await setAdminSession();return json({ok:true})}
 if(action==='logout'){await clearAdminSession();return json({ok:true})}
 if(['upload','save','archive','wallet','review'].includes(action||'')&&!await isAdmin())return json({error:'Owner access required.'},403);
 if(action==='upload'){
 const length=Number(req.headers.get('content-length'));if(length>55*1024*1024)return json({error:'Maximum file size is 50 MB.'},413);const data=await req.formData(),file=data.get('file'),kind=data.get('kind');
 if(!(file instanceof File)||!file.size||file.size>50*1024*1024)return json({error:'Choose a file smaller than 50 MB.'},400);if(kind!=='preview'&&kind!=='download')return json({error:'Invalid upload type.'},400);
 if(kind==='preview'&&!['image/png','image/jpeg','image/webp','image/gif','video/mp4','video/webm'].includes(file.type))return json({error:'Use JPG, PNG, WebP, GIF, MP4 or WebM previews.'},400);
 await initStore();const key=crypto.randomUUID();await writeFile(storagePath(kind,key),Buffer.from(await file.arrayBuffer()),{mode:0o600});return json({key,name:file.name,type:file.type});
 }
 const b=await req.json() as any;
 if(action==='save'){
 if(typeof b.title!=='string'||!b.title.trim()||b.title.length>100||typeof b.description!=='string'||b.description.length>5000||!['Websites','Motion','3D & Visuals','Templates'].includes(b.category)||!Number.isInteger(b.price)||b.price<0||b.price>100000000)return json({error:'Check the title, description, category and price.'},400);
 if(!safeKey(b.preview)||!safeKey(b.file)||!await exists('preview',b.preview)||!await exists('download',b.file))return json({error:'Upload both preview and download files.'},400);
 const id=b.id||crypto.randomUUID();await updateStore(store=>{const value:StoredProduct={id,title:b.title.trim(),description:b.description,category:b.category,price:b.price,preview:b.preview,preview_content_type:['image/png','image/jpeg','image/webp','image/gif','video/mp4','video/webm'].includes(b.preview_content_type)?b.preview_content_type:(b.media_type==='video'?'video/mp4':'image/webp'),media_type:b.media_type==='video'?'video':'image',file:b.file,filename:String(b.filename||'download').slice(0,250),created:Date.now(),archived:0};const i=store.products.findIndex(p=>p.id===id);if(i>=0)store.products[i]={...store.products[i],...value};else store.products.push(value)});return json({ok:true,id});
 }
 if(action==='archive'){await updateStore(store=>{const p=store.products.find(p=>p.id===b.id);if(p)p.archived=1});return json({ok:true})}
 if(action==='wallet'){if(b.wallet!==''&&(!/^0x[a-fA-F0-9]{40}$/.test(b.wallet)||/^0x0{40}$/i.test(b.wallet)))return json({error:'Enter a valid nonzero Arbitrum wallet address.'},400);await updateStore(store=>{store.settings.wallet=b.wallet});return json({ok:true})}
 if(action==='checkout'){const result=await updateStore(store=>{const p=store.products.find(p=>p.id===b.id&&!p.archived);if(!p||p.price<=0)throw new Error('UNAVAILABLE');if(!store.settings.wallet)throw new Error('NO_WALLET');const order:StoredOrder={id:crypto.randomUUID(),product_id:p.id,title:p.title,price:p.price,wallet:store.settings.wallet,status:'awaiting-payment',token:crypto.randomUUID()+crypto.randomUUID(),created:Date.now()};store.orders.push(order);return order});return json(result)}
 if(action==='receipt'){if(!/^0x[a-fA-F0-9]{64}$/.test(b.tx))return json({error:'Enter the full transaction hash (0x and 64 characters).'},400);await updateStore(store=>{if(store.orders.some(o=>o.tx===b.tx.toLowerCase()))throw new Error('DUPLICATE');const order=store.orders.find(o=>o.id===b.id&&o.token===b.token&&o.status==='awaiting-payment');if(!order)throw new Error('ORDER');order.tx=b.tx.toLowerCase();order.status='pending-review'});return json({ok:true})}
 if(action==='review'){if(!['approved','rejected'].includes(b.status))return json({error:'Invalid review.'},400);await updateStore(store=>{const order=store.orders.find(o=>o.id===b.id&&o.status==='pending-review');if(order)order.status=b.status});return json({ok:true})}
 return json({error:'Unknown action.'},400);
 }catch(e){const message=(e as Error).message;if(message==='NO_WALLET')return json({error:'Payments open once the creator adds a wallet.'},409);if(message==='UNAVAILABLE')return json({error:'This product is not available for checkout.'},400);if(message==='DUPLICATE')return json({error:'This transaction has already been submitted.'},400);if(message==='ORDER')return json({error:'Order cannot be updated.'},409);return json({error:'Unable to save. Please try again.'},400)}
}
