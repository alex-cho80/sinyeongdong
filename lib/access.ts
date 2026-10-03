import {env} from 'cloudflare:workers';
import {accessFor} from './access-policy';
export function requestAccess(req:Request){return accessFor(req.headers,(env as unknown as {ADMIN_EMAIL?:string}).ADMIN_EMAIL);}
