import {env} from 'cloudflare:workers';
import {getChatGPTUser} from '../../chatgpt-auth';
export const dynamic='force-dynamic';
const json=(data:unknown,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store'}});
async function setting(key:string){return (await env.DB!.prepare('SELECT value FROM settings WHERE key=?').bind(key).first<{value:string}>())?.value||''}
async function isAdmin(){const user=await getChatGPTUser();return !!user && user.userId===await setting('owner')}
export async function GET(req:Request){
 try{
 const url=new URL(req.url),action=url.searchParams.get('action');
 if(!env.DB||!env.BUCKET)return json({error:'Storage is not connected yet.'},503);
 if(action==='studio')return json({admin:await isAdmin(),setup:!(await setting('owner')),signedIn:!!(await getChatGPTUser())});
 if(action==='orders'){if(!await isAdmin())return json({error:'Owner access required.'},403);return json((await env.DB.prepare('SELECT id,title,price,wallet,tx,status,created FROM orders WHERE tx IS NOT NULL ORDER BY created DESC').all()).results)}
 if(action==='order'){const o=await env.DB.prepare('SELECT id,product_id,title,price,wallet,status,token FROM orders WHERE id=? AND token=?').bind(url.searchParams.get('id'),url.searchParams.get('token')).first();return o?json(o):json({error:'Order not found.'},404)}
 if(action==='media'||action==='download'){
 let key='',name='download';
 const p=await env.DB.prepare('SELECT * FROM products WHERE id=?').bind(url.searchParams.get('id')).first<any>();
 if(!p)return json({error:'Product not found.'},404);
 if(action==='media')key=p.preview;
 else {if(p.price>0&&!await isAdmin()){const o=await env.DB.prepare("SELECT id FROM orders WHERE product_id=? AND token=? AND status='approved'").bind(p.id,url.searchParams.get('token')||'').first();if(!o)return json({error:'Payment must be reviewed before downloading.'},403)}key=p.file;name=p.filename}
 const obj=await env.BUCKET.get(key);if(!obj)return json({error:'File not found.'},404);
 const headers=new Headers({'X-Content-Type-Options':'nosniff','Cache-Control':action==='download'?'private, no-store':'public, max-age=3600'});obj.writeHttpMetadata(headers);
 if(action==='download'){headers.set('Content-Type','application/octet-stream');headers.set('Content-Disposition',`attachment; filename*=UTF-8''${encodeURIComponent(name)}`)}
 return new Response(obj.body,{headers});
 }
 const list=await env.DB.prepare('SELECT id,title,description,category,price,media_type,filename FROM products WHERE archived=0 ORDER BY created DESC').all();
 return json({products:list.results.map((p:any)=>({...p,preview:`/api/store?action=media&id=${p.id}`})),wallet:await setting('wallet')});
 }catch{ return json({error:'Unable to load the store. Please try again.'},500)}
}
export async function POST(req:Request){
 try{
 if(!env.DB||!env.BUCKET)return json({error:'Storage is not connected.'},503);
 if(req.headers.get('origin')!==new URL(req.url).origin)return json({error:'Invalid request origin.'},403);
 const action=new URL(req.url).searchParams.get('action');
 if(action==='setup'){
 const user=await getChatGPTUser();if(!user)return json({error:'Sign in to set up your private studio.'},401);
 // First-time setup is available only while this deployment is owner-private.
 await env.DB.prepare("INSERT OR IGNORE INTO settings(key,value) VALUES('owner',?)").bind(user.userId).run();
 return await isAdmin()?json({ok:true}):json({error:'This studio already has an owner.'},403);
 }
 if(['upload','save','archive','wallet','review'].includes(action||'')&&!await isAdmin())return json({error:'Owner access required.'},403);
 if(action==='upload'){
 const length=Number(req.headers.get('content-length'));if(length>55*1024*1024)return json({error:'Maximum file size is 50 MB.'},413);
 const data=await req.formData(),file=data.get('file'),kind=data.get('kind');
 if(!(file instanceof File)||!file.size||file.size>50*1024*1024)return json({error:'Choose a file smaller than 50 MB.'},400);
 if(kind!=='preview'&&kind!=='download')return json({error:'Invalid upload type.'},400);
 if(kind==='preview'&&!['image/png','image/jpeg','image/webp','image/gif','video/mp4','video/webm'].includes(file.type))return json({error:'Use JPG, PNG, WebP, GIF, MP4 or WebM previews.'},400);
 const key=`${kind}/${crypto.randomUUID()}`;await env.BUCKET.put(key,file.stream(),{httpMetadata:{contentType:kind==='preview'?file.type:'application/octet-stream'}});
 return json({key,name:file.name,type:file.type});
 }
 const b=await req.json() as any;
 if(action==='save'){
 if(typeof b.title!=='string'||!b.title.trim()||b.title.length>100||typeof b.description!=='string'||b.description.length>5000||!['Websites','Motion','3D & Visuals','Templates'].includes(b.category)||!Number.isInteger(b.price)||b.price<0||b.price>100000000)return json({error:'Check the title, description, category and price.'},400);
 if(!/^preview\/[a-f0-9-]{36}$/.test(b.preview)||!/^download\/[a-f0-9-]{36}$/.test(b.file))return json({error:'Upload both preview and download files.'},400);
 if(!await env.BUCKET.head(b.preview)||!await env.BUCKET.head(b.file))return json({error:'Uploaded file missing. Please upload again.'},400);
 const id=b.id||crypto.randomUUID();
 await env.DB.prepare('INSERT INTO products(id,title,description,category,price,preview,media_type,file,filename,created) VALUES(?,?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET title=excluded.title,description=excluded.description,category=excluded.category,price=excluded.price,preview=excluded.preview,media_type=excluded.media_type,file=excluded.file,filename=excluded.filename').bind(id,b.title.trim(),b.description,b.category,b.price,b.preview,b.media_type==='video'?'video':'image',b.file,String(b.filename||'download').slice(0,250),Date.now()).run();return json({ok:true,id});
 }
 if(action==='archive'){await env.DB.prepare('UPDATE products SET archived=1 WHERE id=?').bind(b.id).run();return json({ok:true})}
 if(action==='wallet'){if(b.wallet!==''&&(!/^0x[a-fA-F0-9]{40}$/.test(b.wallet)||/^0x0{40}$/i.test(b.wallet)))return json({error:'Enter a valid nonzero Arbitrum wallet address.'},400);await env.DB.prepare("INSERT INTO settings(key,value) VALUES('wallet',?) ON CONFLICT(key) DO UPDATE SET value=excluded.value").bind(b.wallet).run();return json({ok:true})}
 if(action==='checkout'){
 const p=await env.DB.prepare('SELECT id,title,price FROM products WHERE id=? AND archived=0').bind(b.id).first<any>(),wallet=await setting('wallet');
 if(!p||p.price<=0)return json({error:'This product is not available for checkout.'},400);
 if(!wallet)return json({error:'Payments open once the creator adds a wallet.'},409);
 const id=crypto.randomUUID(),token=crypto.randomUUID()+crypto.randomUUID();
 await env.DB.prepare("INSERT INTO orders(id,product_id,title,price,wallet,status,token,created) VALUES(?,?,?,?,?,'awaiting-payment',?,?)").bind(id,p.id,p.title,p.price,wallet,token,Date.now()).run();return json({id,token,title:p.title,price:p.price,wallet,status:'awaiting-payment'});
 }
 if(action==='receipt'){
 if(!/^0x[a-fA-F0-9]{64}$/.test(b.tx))return json({error:'Enter the full transaction hash (0x and 64 characters).'},400);
 const updated=await env.DB.prepare("UPDATE orders SET tx=?,status='pending-review' WHERE id=? AND token=? AND status='awaiting-payment'").bind(b.tx.toLowerCase(),b.id,b.token).run();return updated.meta.changes?json({ok:true}):json({error:'Order cannot be updated.'},409);
 }
 if(action==='review'){
 if(!['approved','rejected'].includes(b.status))return json({error:'Invalid review.'},400);
 await env.DB.prepare("UPDATE orders SET status=? WHERE id=? AND status='pending-review'").bind(b.status,b.id).run();return json({ok:true});
 }
 return json({error:'Unknown action.'},400);
 }catch(e){return json({error:String(e).includes('UNIQUE')?'This transaction has already been submitted.':'Unable to save. Please try again.'},400)}
}

