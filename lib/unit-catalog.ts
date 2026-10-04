import {env} from 'cloudflare:workers';
import {database} from './store';
import {candidates,reviewParcels} from './candidates';
import {clean} from './housing';

// Preserve long registry identifiers before JSON number conversion loses precision.
export function parseRegistry(text:string){return JSON.parse(text.replace(/("(?:mgmBldrgstPk|mgmUpperBldrgstPk)"\s*:\s*)(\d{16,})(?=\s*[,}])/g,'$1"$2"'));}
async function getJson(url:URL){let last:unknown;for(let attempt=0;attempt<3;attempt++){try{const r=await fetch(url,{signal:AbortSignal.timeout(18000)});if(!r.ok)throw Error(`HTTP ${r.status}`);return parseRegistry(await r.text());}catch(e){last=e;if(attempt<2)await new Promise(resolve=>setTimeout(resolve,400*(attempt+1)));}}throw last;}
export async function unitCatalog(parcel:string,refresh=false){
 const c=candidates.find(c=>c.parcel===parcel);if(!c||reviewParcels.has(parcel))throw Error('호수 확인 대상 지번이 아닙니다.');
 const secrets=env as unknown as {BUILDING_API_KEY?:string;JUSO_DETAIL_API_KEY?:string};
 const db=database();const cached:any=await db.prepare('SELECT payload FROM unit_lookups WHERE parcel=?').bind(parcel).first();
 if(cached&&!refresh){const prior=JSON.parse(cached.payload);const obsolete=prior.catalogVersion!==2||(!!secrets.JUSO_DETAIL_API_KEY&&prior.addressStatus==='not_configured');const failed=prior.registryStatus==='error'||prior.addressStatus==='error';if(!obsolete&&(!failed||Date.now()-Date.parse(prior.checked)<60000))return prior;}
 const source:any=await db.prepare('SELECT payload FROM lookups WHERE parcel=?').bind(parcel).first();if(!source)throw Error('건축물 기본 조회가 필요합니다.');
 const lookup=JSON.parse(source.payload);
 const result:any={parcel,catalogVersion:2,checked:new Date().toISOString(),registryStatus:'success',addressStatus:'not_configured',rows:[],addressRows:[],errors:[]};
 const lots=[...new Set([parcel,...(lookup.addresses??[]).map((a:any)=>a.primaryParcel).filter(Boolean),...(lookup.buildings??[]).map((b:any)=>b.queriedParcel).filter(Boolean)])].slice(0,5) as string[];
 try{
  if(!secrets.BUILDING_API_KEY)throw Error('건축물대장 인증키 미설정');
  for(const lot of lots){const [bun,ji='0']=lot.split('-');let total=0;
   for(let page=1;page<=10;page++){
    const url=new URL('https://apis.data.go.kr/1613000/BldRgstHubService/getBrExposPubuseAreaInfo');url.search=new URLSearchParams({serviceKey:secrets.BUILDING_API_KEY,sigunguCd:c.lawCode.slice(0,5),bjdongCd:c.lawCode.slice(5),platGbCd:'0',bun:bun.padStart(4,'0'),ji:ji.padStart(4,'0'),numOfRows:'100',pageNo:String(page),_type:'json'}).toString();
    const data=await getJson(url);if(!['00','0'].includes(String(data.response?.header?.resultCode)))throw Error(`건축HUB ${data.response?.header?.resultCode??'응답 오류'}`);
    const body=data.response.body;let items=body.items?.item??[];if(!Array.isArray(items))items=[items];total+=items.length;
    result.rows.push(...items.map((r:any)=>({id:clean(r.mgmBldrgstPk),parentId:clean(r.mgmUpperBldrgstPk),dong:clean(r.dongNm),ho:clean(r.hoNm),name:clean(r.bldNm),floor:clean(r.flrNoNm),floorCode:clean(r.flrGbCd),purpose:clean(r.mainPurpsCdNm),detail:clean(r.etcPurps),ownership:clean(r.exposPubuseGbCdNm),ownershipCode:clean(r.exposPubuseGbCd),lot,source:'건축물대장 전유공용면적'})));
    if(total>=Number(body.totalCount??0))break;if(page===10)throw Error('전유부 페이지 한도 초과');
   }
  }
 }catch(e){result.registryStatus='error';result.errors.push(e instanceof Error?e.message:'전유부 조회 오류');}
 // Always query the independently approved detail API, even when registry units exist.
 if(secrets.JUSO_DETAIL_API_KEY){
  result.addressStatus='success';
  try{
   const addresses=lookup.addresses??[];
   if(addresses.length>3)throw Error('상세주소 건물 주소 3건 초과 · 개별 확인 필요');
   if(!addresses.length)result.addressStatus='not_available';
   for(const a of addresses){
    const numbers=clean(a.road).match(/(?:로|길)\s+(지하\s*)?(\d+)(?:-(\d+))?/);
    const main=clean(a.buildingMain)||numbers?.[2];
    const sub=clean(a.buildingSub)||numbers?.[3]||'0';
    if(!main||!a.roadCode)throw Error('상세주소 조회에 필요한 건물번호·도로명코드 없음');
    const common={confmKey:secrets.JUSO_DETAIL_API_KEY,admCd:c.lawCode,rnMgtSn:a.roadCode,udrtYn:clean(a.underground)||(numbers?.[1]?'1':'0'),buldMnnm:main,buldSlno:sub,resultType:'json'};
    const asRows=(v:any)=>Array.isArray(v)?v:v&&typeof v==='object'?[v]:[];
    const first=new URL('https://business.juso.go.kr/addrlink/addrDetailApi.do');first.search=new URLSearchParams({...common,searchType:'dong'}).toString();
    const d=await getJson(first);if(String(d.results?.common?.errorCode)!=='0')throw Error('상세주소 '+String(d.results?.common?.errorCode??'응답 오류')+' · 상세주소 승인키 확인 필요');
    let names=[...new Set(asRows(d.results.juso).map((r:any)=>clean(r.dongNm)))] as string[];
    if(names.length>10)throw Error('상세주소 동 10개 초과 · 개별 확인 필요');
    if(!names.length)names=[''];
    for(const dong of names){
     const u=new URL('https://business.juso.go.kr/addrlink/addrDetailApi.do');u.search=new URLSearchParams({...common,searchType:'floorho',dongNm:dong}).toString();
     const d=await getJson(u);if(String(d.results?.common?.errorCode)!=='0')throw Error('상세주소 '+String(d.results?.common?.errorCode??'응답 오류')+' · 상세주소 승인키 확인 필요');
     result.addressRows.push(...asRows(d.results.juso).filter((r:any)=>clean(r.hoNm)).map((r:any)=>({dong:clean(r.dongNm)||dong,ho:clean(r.hoNm),floor:clean(r.floorNm),buildingId:a.buildingId,primaryParcel:a.primaryParcel,road:a.road,source:'도로명 상세주소'})));
    }
   }
   if(result.addressStatus==='success'&&!result.addressRows.length)result.addressStatus='no_data';
  }catch(e){result.addressStatus='error';result.errors.push(e instanceof Error?e.message:'상세주소 조회 오류');}
 }
 // This cache contains only public official address data, never consent edits.
 if(result.registryStatus==='error'&&cached){const old=JSON.parse(cached.payload);if(old.registryStatus==='success'){result.rows=old.rows;result.retainedChecked=old.checked;}}
 await db.prepare('INSERT INTO unit_lookups(parcel,payload,updated) VALUES(?,?,?) ON CONFLICT(parcel) DO UPDATE SET payload=excluded.payload,updated=excluded.updated').bind(parcel,JSON.stringify(result),result.checked).run();
 return result;
}
