import {unitCatalog} from '@/lib/unit-catalog';
import {guard,failure} from '@/lib/store';
// Read-through official-data cache. Consent/user records are never modified here.
export async function GET(req:Request){try{return Response.json(await unitCatalog(new URL(req.url).searchParams.get('parcel')??''),{headers:{'Cache-Control':'no-store'}});}catch(e){return failure(e);}}
export async function POST(req:Request){const g=guard(req);if(g)return g;try{const p=await req.json() as {parcel:string};return Response.json(await unitCatalog(p.parcel,true));}catch(e){return failure(e);}}
