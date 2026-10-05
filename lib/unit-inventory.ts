import {consentEligible} from './consent-exclusions';
import {candidates,reviewParcels} from './candidates';
import {buildingName,clean,compareSurveyUnitsAsc} from './housing';

export type SurveyUnit={id:string;parcel:string;parcels:string[];buildingId:string;building:string;unit:string;status:string;revision:number;source:string;official:boolean;basis:string;warning:string;road:string;floor:string;detailCheck?:string;visitStatus?:string;ownerStatus?:string};
export const unitMatchesParcel=(u:{parcel:string;parcels?:string[]},p:string)=>u.parcel===p||!!u.parcels?.includes(p);
const count=(n:unknown)=>Number.isInteger(Number(n))&&Number(n)>0?Number(n):0;
const norm=(v:unknown)=>clean(v).replace(/\s/g,'').replace(/동$/,'');
const numbered=(ho:string)=>ho.endsWith('호')?ho:`${ho}호`;

export function buildInventory(lookups:any[],catalogs:any[],saved:any[]=[]){
 const groups=new Map<string,{b:any;aliases:Set<string>;lookup:any}>();
 for(const l of lookups){if(reviewParcels.has(l.parcel)||!candidates.some(c=>c.parcel===l.parcel&&(!l.lawCode||c.lawCode===l.lawCode)))continue;
  for(const b of l.buildings??[]){if(b.main==='부속건축물'||!b.id)continue;const old=groups.get(String(b.id));if(old)old.aliases.add(l.parcel);else groups.set(String(b.id),{b,aliases:new Set([l.parcel]),lookup:l});}
 }
 const units:SurveyUnit[]=[];const buildings:any[]=[];const issues:any[]=[];const used=new Set<string>();
 for(const [id,g] of groups){
  const {b,aliases}=g;const parcel=aliases.has(b.queriedParcel)?b.queriedParcel:[...aliases].sort((a,b)=>a.localeCompare(b,'ko',{numeric:true}))[0];
  const lookup=lookups.find(l=>l.parcel===parcel)??g.lookup;
  const h=count(b.households),f=count(b.families);const collective=/공동주택|연립|다세대|아파트/.test(b.type+' '+b.detail);
  const expected=collective?(h||f):(f||h);const basis=collective?(h?'대장 세대수':'대장 가구수'):(f?'대장 가구수':'대장 세대수');
  const siblings=[...groups.values()].filter(v=>v.b.queriedParcel===b.queriedParcel&&v.b.lawCode===b.lawCode);
  const namedLookup=lookups.find(l=>aliases.has(l.parcel)&&[...(l.addresses??[]),...(l.buildings??[])].some((r:any)=>clean(r.name)));
  const displayName=clean(b.name)||buildingName(namedLookup??lookup,'주택');
  const siblingIndex=siblings.findIndex(v=>String(v.b.id)===id)+1;
  const building=(displayName==='명칭 미기재'?'명칭 미기재':displayName)+(clean(b.dong)&&clean(b.dong)!==displayName?' · '+clean(b.dong):siblings.length>1?' · 건물 '+siblingIndex:'');
  const notes:string[]=[];
  if([...aliases].some(p=>['230-1','214-62','229-10','232-1','214-95'].includes(p)))notes.push('2026-10-05 현장 제보: 1가구 추정 · 대장 수량과 다름, 실거주 가구수 확인 필요');
  const detailNumber=clean(b.detail).match(/(\d+)\s*(?:가구|세대)/);if(detailNumber&&Number(detailNumber[1])!==expected)notes.push(`대장 수량 ${expected} / 상세용도 ${detailNumber[1]} 불일치`);
  if(h&&f&&h!==f)notes.push(`세대수 ${h} / 가구수 ${f} 상이`);
  if(expected&&!/주택|아파트/.test(b.type+' '+b.detail))notes.push('비주택 용도에 가구수 기재 · 주거 여부 확인');
  const available=catalogs.filter(c=>aliases.has(c.parcel));const catalog=available.find(c=>c.registryStatus==='success'&&c.rows?.length)??available.find(c=>c.parcel===parcel)??available[0];
  const matchesDong=(r:any)=>siblings.length===1||r.parentId===id||(norm(b.dong)&&norm(r.dong)===norm(b.dong));
  const area=(catalog?.rows??[]).filter((r:any)=>r.ho&&r.ownershipCode==='1'&&(!r.lot||r.lot===b.queriedParcel)&&/주택|아파트/.test(r.purpose+' '+r.detail)&&matchesDong(r));
  let official=[...new Map(area.map((r:any)=>[`${norm(r.dong)}|${clean(r.ho)}`,r])).values()] as any[];
  const detailRows=(catalog?.addressRows??[]).filter((r:any)=>r.primaryParcel===b.queriedParcel&&matchesDong(r));
  let detailCheck='상세주소 미조회';
  if(catalog?.catalogVersion!==2)detailCheck='상세주소 재조회 필요';
  else if(catalog.addressStatus==='error')detailCheck='상세주소 조회 오류';
  else if(catalog.addressStatus==='not_configured')detailCheck='상세주소 승인키 미등록';
  else if(catalog.addressStatus==='no_data')detailCheck='상세주소 호수 결과 없음';
  else if(catalog.addressStatus==='not_available')detailCheck='상세주소 조회할 건물 주소 없음';
  else if(catalog.addressStatus==='success'){
   const key=(r:any)=>(siblings.length>1?norm(r.dong)+'|':'')+clean(r.ho).replace(/^.*층/,'').replace(/\s/g,'').replace(/호$/,'').toUpperCase();
   const registrySet=new Set(official.map(key)),addressSet=new Set(detailRows.map(key));
   detailCheck=catalog.registryStatus==='success'&&registrySet.size>0&&registrySet.size===addressSet.size&&[...registrySet].every(k=>addressSet.has(k))?'대장·상세주소 호수 일치':'대장·상세주소 호수 대조 필요';
  }
  if(!official.length&&siblings.length===1&&catalog?.catalogVersion===2&&catalog.addressStatus==='success'&&detailRows.length){const detailUnits=[...new Map(detailRows.map((r:any)=>[`${norm(r.dong)}|${clean(r.ho)}`,r])).values()] as any[];if(detailUnits.length===expected)official=detailUnits;else notes.push(`상세주소 ${detailUnits.length}호 / 대장 ${expected} 불일치 · 자동 연결 보류`);}
  if(official.length&&saved.some(s=>s.id.startsWith(`survey:${id}:`))){notes.push('기존 조사용 호수의 동의 보존 · 공식 호수 연결 확인 필요');official=[];}
  official.sort((a,b)=>(clean(a.dong)+' '+clean(a.ho)).localeCompare(clean(b.dong)+' '+clean(b.ho),'ko',{numeric:true}));
  if(official.length&&expected&&official.length!==expected)notes.push(`공식 주거 전유호 ${official.length} / 대장 ${expected} 불일치`);
  const detailCount=detailNumber&&/주택|아파트/.test(b.type+' '+b.detail)?Number(detailNumber[1]):0;
  const size=Math.max(expected,official.length,detailCount);
  if(!size){if(/주택|아파트/.test(b.type+' '+b.detail))issues.push({parcel,building,reason:'주택 용도이나 대장 수량 0 · 현장 확인 필요'});buildings.push({id,parcel,parcels:[...aliases],building,count:0,basis,warning:notes.join(' · ')});continue;}
  for(let i=0;i<size;i++){
   const o=official[i];const unitId=o?`official:${id}:${norm(o.dong)}:${clean(o.ho)}`:`survey:${id}:${i+1}`;
   units.push({id:unitId,parcel,parcels:[...aliases],buildingId:id,building,unit:o?numbered(clean(o.ho)):`조사용 ${i+1}호`,status:'미조사',revision:0,source:o?o.source:detailCount>expected?'대장 상세용도 수량 기준 임시 구분':'대장 수량 기준 임시 구분',official:!!o,basis:`${basis} ${expected}${detailCount>expected?' · 상세용도 '+detailCount:''}`,warning:notes.join(' · '),road:clean(b.road)||lookup.addresses?.[0]?.road||'',floor:clean(o?.floor),detailCheck});
  }
  if(notes.length)issues.push({parcel,building,reason:notes.join(' · ')});
  buildings.push({id,parcel,parcels:[...aliases],building,count:size,officialCount:official.length,detailCheck,basis:`${basis} ${expected}${detailCount>expected?' · 상세용도 '+detailCount:''}`,warning:notes.join(' · ')});
 }
 // A saved consent always wins. Never transfer it to a different official unit.
 const merged=units.map(u=>{const s=saved.find(s=>s.id===u.id)||saved.find(s=>!used.has(s.id)&&unitMatchesParcel(u,s.parcel)&&s.building===u.building&&s.unit===u.unit);if(!s)return u;used.add(s.id);return {...u,...s,parcels:u.parcels,source:s.unit===u.unit?u.source:'관리자 호수 확인',official:s.unit===u.unit?u.official:true};});
 for(const s of saved){if(used.has(s.id))continue;merged.push({...s,parcels:[s.parcel],buildingId:'manual',source:'수동 등록 · 중복 여부 확인',official:false,basis:'관리자 등록',warning:'자동 목록과 중복 여부 확인',road:'',floor:''});}
 for(const unit of merged){unit.visitStatus??='미확인';unit.ownerStatus??='미확인';}
 merged.sort(compareSurveyUnitsAsc);
 const targetParcels=lookups.filter(l=>!reviewParcels.has(l.parcel)&&(l.buildings??[]).some((b:any)=>b.main!=='부속건축물'&&(/주택|아파트/.test(b.type+' '+b.detail)||count(b.households)||count(b.families)))).map(l=>l.parcel);
 const checks=targetParcels.map(p=>catalogs.find(c=>c.parcel===p)).filter(c=>c?.catalogVersion===2);
 const detailSummary={total:targetParcels.length,attempted:checks.length,pending:targetParcels.length-checks.length,success:checks.filter(c=>c.addressStatus==='success').length,errors:checks.filter(c=>c.addressStatus==='error').length,noData:checks.filter(c=>c.addressStatus==='no_data').length,noAddress:checks.filter(c=>c.addressStatus==='not_available').length,notConfigured:checks.filter(c=>c.addressStatus==='not_configured').length,matchedBuildings:buildings.filter(b=>b.detailCheck==='대장·상세주소 호수 일치').length};
 return {units:merged,buildings,issues,summary:{detail:detailSummary,total:merged.length,consentTotal:merged.filter(consentEligible).length,excludedUnits:merged.filter(u=>!consentEligible(u)).length,official:merged.filter(u=>u.official).length,provisional:merged.filter(u=>!u.official).length,buildingCount:buildings.filter(b=>b.count).length,unresolvedBuildings:issues.filter(i=>i.reason.includes('수량 0')).length,unresolvedParcels:lookups.filter(l=>!reviewParcels.has(l.parcel)&&!l.buildings?.length).length,unitLookupErrors:catalogs.filter(c=>c.registryStatus==='error').length,conflicts:issues.filter(i=>!i.reason.includes('수량 0')).length,reviewParcels:reviewParcels.size}};
}
