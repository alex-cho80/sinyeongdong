// Display helpers preserve registry counts: 세대수 and 가구수 are not interchangeable.
export const clean=(v:unknown)=>typeof v==='string'?v.trim():v==null?'':String(v);
export function uniqueBuildings(l:any){return [...new Map((l?.buildings??[]).map((b:any)=>[String(b.id),b])).values()] as any[];}
export function buildingName(l:any,fallback='미조회'){
 if(!l)return fallback;
 const names=[...(l?.addresses??[]).map((a:any)=>clean(a.name)),...uniqueBuildings(l).map(b=>clean(b.name))].filter(Boolean);
 if(names.length)return [...new Set(names)].join(' · ');
 if(l.buildings?.length||l.addresses?.length)return '명칭 미기재';
 if(l.errors?.length||l.addressStatus==='error'||l.buildingStatus==='error')return '조회 오류';
 return l.checked?'조회 결과 없음':fallback;
}
export function housingType(b:any){const s=clean(b.detail);for(const type of ['다가구주택','다세대주택','연립주택','아파트','다중주택'])if(s.includes(type))return type;return clean(b.type)||'미기재';}
export function emptyRegistryText(l:any){if(!l?.checked)return '미조회';return l.buildingStatus==='error'?'대장 조회 오류':'대장 결과 없음';}
export function types(l:any){return [...new Set(uniqueBuildings(l).map(housingType))].join(' / ')||emptyRegistryText(l);}
export function countText(l:any){const bs=uniqueBuildings(l);if(!bs.length)return emptyRegistryText(l);const h=bs.reduce((n,b)=>n+(Number(b.households)||0),0),f=bs.reduce((n,b)=>n+(Number(b.families)||0),0);return `${h}세대 / ${f}가구`;}
export function lookupStatus(l:any){if(!l?.checked)return '미조회';if(l.errors?.length||l.addressStatus==='error'||l.buildingStatus==='error')return '조회 오류 있음';return l.buildings?.length?'조회 완료':'조회 완료 · 대장 결과 없음';}
export function roadText(l:any){const roads=[...new Set((l?.addresses??[]).map((a:any)=>clean(a.road)).filter(Boolean))];if(roads.length)return roads.join(' / ');if(!l?.checked)return '미조회';return l.addressStatus==='error'?'주소 조회 오류':'주소 결과 없음';}

// Display order only: numeric parcel main/sub-number, then numeric unit number.
export function compareParcelsAsc(a:string,b:string){
 const [am,as=0]=a.split('-').map(Number),[bm,bs=0]=b.split('-').map(Number);
 return (am-bm)||(as-bs)||a.localeCompare(b,'ko',{numeric:true});
}
export function compareSurveyUnitsAsc(a:{parcel:string;unit:string;building:string},b:{parcel:string;unit:string;building:string}){
 const parcelOrder=compareParcelsAsc(a.parcel,b.parcel);if(parcelOrder)return parcelOrder;
 const number=(unit:string)=>Number(unit.match(/\d+/g)?.at(-1)??-1);
 return (number(a.unit)-number(b.unit))||a.unit.localeCompare(b.unit,'ko',{numeric:true})||a.building.localeCompare(b.building,'ko',{numeric:true});
}
