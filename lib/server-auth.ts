import 'server-only';
import {createHmac,scryptSync,timingSafeEqual} from 'node:crypto';
import {cookies} from 'next/headers';
const cookieName='vf_admin';
const maxAge=60*60*24*14;
function secret(){const value=process.env.ADMIN_SESSION_SECRET;if(!value||value.length<32)throw new Error('ADMIN_SESSION_SECRET must be at least 32 characters');return value}
function sign(value:string){return createHmac('sha256',secret()).update(value).digest('base64url')}
export async function isAdmin(){const value=(await cookies()).get(cookieName)?.value;if(!value)return false;const [expires,signature]=value.split('.');if(!expires||!signature||Number(expires)<Date.now())return false;const expected=sign(expires);return expected.length===signature.length&&timingSafeEqual(Buffer.from(expected),Buffer.from(signature))}
export async function setAdminSession(){const expires=String(Date.now()+maxAge*1000);(await cookies()).set(cookieName,`${expires}.${sign(expires)}`,{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'strict',path:'/',maxAge})}
export async function clearAdminSession(){(await cookies()).delete(cookieName)}
export function verifyAdminPassword(password:string){const encoded=process.env.ADMIN_PASSWORD_HASH||'';const [kind,salt,hash]=encoded.split('$');if(kind!=='scrypt'||!salt||!hash||password.length>256)return false;const actual=scryptSync(password,salt,32);const expected=Buffer.from(hash,'hex');return expected.length===actual.length&&timingSafeEqual(expected,actual)}
