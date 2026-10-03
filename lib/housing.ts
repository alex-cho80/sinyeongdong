// Display helpers preserve registry counts: 세대수 and 가구수 are not interchangeable.
export const clean=(v:unknown)=>typeof v==='string'?v.trim():v==null?'':String(v);
export function uniqueBuildings(l:any){return [...new Map((l?.buildings??[]).map((b:any)=>[String(b.id),b])).values()] as any[];}
export function buildingName(l:any,fallback='미확인'){
 const names=[...(l?.addresses??[]).map((a:any)=>clean(a.name)),...uniqueBuildings(l).map(b=>clean(b.name))].filter(Boolean);
 return [...new Set(names)].join(' · ')||(l?.buildings?.length?'명칭 미기재':fallback);
}
export function housingType(b:any){const s=clean(b.detail);for(const type of ['다가구주택','다세대주택','연립주택','아파트','다중주택'])if(s.includes(type))return type;return clean(b.type)||'미기재';}
export function types(l:any){return [...new Set(uniqueBuildings(l).map(housingType))].join(' / ')||'미확인';}
export function countText(l:any){const bs=uniqueBuildings(l);if(!bs.length)return '미확인';const h=bs.reduce((n,b)=>n+(Number(b.households)||0),0),f=bs.reduce((n,b)=>n+(Number(b.families)||0),0);return `${h}세대 / ${f}가구`;}
