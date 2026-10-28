import 'server-only';
import {mkdir,readFile,rename,writeFile} from 'node:fs/promises';
import {join} from 'node:path';

export type StoredProduct={id:string;title:string;description:string;category:string;price:number;preview:string;preview_content_type:string;media_type:'image'|'video';file:string;filename:string;created:number;archived:number};
export type StoredOrder={id:string;product_id:string;title:string;price:number;wallet:string;tx?:string;status:'awaiting-payment'|'pending-review'|'approved'|'rejected';token:string;created:number};
type Store={settings:{wallet:string};products:StoredProduct[];orders:StoredOrder[]};
const dataDir=process.env.DATA_DIR||join(process.cwd(),'.data','voidframe');
const storeFile=join(dataDir,'store.json');
let queue=Promise.resolve();

export const storagePath=(kind:'preview'|'download',key:string)=>join(dataDir,kind,key);
export async function initStore(){
  await mkdir(join(dataDir,'preview'),{recursive:true});
  await mkdir(join(dataDir,'download'),{recursive:true});
  try{await readFile(storeFile)}catch{await writeStore({settings:{wallet:''},products:[],orders:[]})}
}
export async function readStore():Promise<Store>{await initStore();return JSON.parse(await readFile(storeFile,'utf8')) as Store}
async function writeStore(value:Store){await mkdir(dataDir,{recursive:true});const tmp=`${storeFile}.${process.pid}.${crypto.randomUUID()}.tmp`;await writeFile(tmp,JSON.stringify(value,null,2),{mode:0o600});await rename(tmp,storeFile)}
export async function updateStore<T>(mutate:(store:Store)=>T|Promise<T>):Promise<T>{
  let release!:()=>void;const previous=queue;queue=new Promise<void>(r=>release=r);await previous;
  try{const store=await readStore();const result=await mutate(store);await writeStore(store);return result}finally{release()}
}
