import {database,failure,guard} from '@/lib/store';
import {parcelIds} from '@/lib/candidates';
import {loadInventory} from '@/lib/load-inventory';
import {z} from 'zod';
const s=z.object({id:z.string().max(250).optional(),parcel:z.string().refine(v=>parcelIds.has(v)),building:z.string().trim().min(1).max(80),unit:z.string().trim().min(1).max(80),status:z.enum(['미조사','동의','비동의','보류']),visitStatus:z.enum(['미확인','미방문','방문 완료']).optional(),ownerStatus:z.enum(['미확인','확인 완료']).optional(),revision:z.number().int().min(0)});
export async function POST(req:Request){
 const g=guard(req);if(g)return g;
 try{
  const parsed=s.safeParse(await req.json());if(!parsed.success)return Response.json({error:'건물 식별명·동호수와 상태를 확인해주세요.'},{status:400});
  const p=parsed.data,db=database(),now=new Date().toISOString();
  let before:any=null;
  if(p.id&&p.revision===0){const inventory=await loadInventory();before=inventory.units.find(u=>u.id===p.id&&u.revision===0);if(!before||before.parcel!==p.parcel||before.building!==p.building||before.unit!==p.unit)return Response.json({error:'조사 목록이 변경되었습니다. 새로고침해주세요.'},{status:409});}
  else if(p.id){before=await db.prepare('SELECT * FROM households WHERE id=? AND parcel=? AND revision=?').bind(p.id,p.parcel,p.revision).first();if(!before)return Response.json({error:'다른 변경이 있습니다. 새로고침 후 다시 시도해주세요.'},{status:409});}
  const row={id:p.id??crypto.randomUUID(),parcel:p.parcel,building:before?.building??p.building,unit:before?.unit??p.unit,status:p.status,visitStatus:p.visitStatus??before?.visitStatus??'미확인',ownerStatus:p.ownerStatus??before?.ownerStatus??'미확인',revision:p.revision+1,updated:now};
  const statement=p.id&&p.revision>0
   ?db.prepare('UPDATE households SET status=?,visitStatus=?,ownerStatus=?,revision=revision+1,updated=? WHERE id=? AND parcel=? AND revision=?').bind(row.status,row.visitStatus,row.ownerStatus,now,row.id,row.parcel,p.revision)
   :db.prepare('INSERT OR IGNORE INTO households(id,parcel,building,unit,status,visitStatus,ownerStatus,revision,updated) VALUES(?,?,?,?,?,?,?,1,?)').bind(row.id,row.parcel,row.building,row.unit,row.status,row.visitStatus,row.ownerStatus,now);
  const results=await db.batch([statement,db.prepare('INSERT INTO audit(id,entity,before,after,at) SELECT ?,?,?,?,? WHERE changes()=1').bind(crypto.randomUUID(),row.id,before?JSON.stringify(before):null,JSON.stringify(row),now)]);
  if(!results[0].meta.changes)return Response.json({error:'다른 변경 또는 중복된 건물·동호수가 있습니다. 새로고침해주세요.'},{status:409});
  return Response.json({ok:true});
 }catch(e){return failure(e);}
}
