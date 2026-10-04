import {env} from 'cloudflare:workers';
import {database} from './store';
import {candidates,reviewParcels} from './candidates';
import {clean} from './housing';

// Preserve long registry identifiers before JSON number conversion loses precision.
export function parseRegistry(text:string){return JSON.parse(text.replace(/("(?:mgmBldrgstPk|mgmUpperBldrgstPk)"\s*:\s*)(\d{16,})(?=\s*[,}])/g,'$1"$2"'));}
async function getJson(url:URL){let last:unknown;for(let attempt=0;attempt<3;attempt++){try{const r=await fetch(url,{signal:AbortSignal.timeout(18000)});if(!r.ok)throw Error(`HTTP ${r.status}`);return parseRegistry(await r.text());}catch(e){last=e;if(attempt<2)await new Promise(resolve=>setTimeout(resolve,400*(attempt+1)));}}throw last;}
export async function unitCatalog(parcel:string,refresh=false){
 const c=candidates.find(c=>c.parcel===parcel);if(!c||reviewParcels.has(parcel))throw Error('호수 확인 대상 지번이 아닙니다.');
 const db=database();const cached:any=await db.prepare('SELECT payload FROM unit_lookups WHERE parcel=?').bind(parcel).first();
 if(cached&&!refresh){const prior=JSON.parse(cached.payload);if(prior.registryStatus!=='error'||Date.now()-Date.parse(prior.checked)<60000)return prior;}
 const source:any=await db.prepare('SELECT payload FROM lookups WHERE parcel=?').bind(parcel).first();if(!source)throw Error('건축물 기본 조회가 필요합니다.');
 const lookup=JSON.parse(source.payload);const secrets=env as unknown as {BUILDING_API_KEY?:string;JUSO_API_KEY?:string};
 const result:any={parcel,checked:new Date().toISOString(),registryStatus:'success',addressStatus:'not_needed',rows:[],addressRows:[],errors:[]};
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
 if(!result.rows.some((r:any)=>r.ho)&&secrets.JUSO_API_KEY){
  result.addressStatus='success';
  try{
   for(const a of (lookup.addresses??[]).slice(0,3)){
    const numbers=clean(a.road).match(/(?:로|길)\s+(\d+)(?:-(\d+))?/);if(!numbers)continue;
    const common={confmKey:secrets.JUSO_API_KEY,admCd:c.lawCode,rnMgtSn:a.roadCode,udrtYn:'0',buldMnnm:numbers[1],buldSlno:numbers[2]??'0',resultType:'json'};
    const first=new URL('https://business.juso.go.kr/addrlink/addrDetailApi.do');first.search=new URLSearchParams({...common,searchType:'dong'}).toString();
    const d=await getJson(first);if(d.results?.common?.errorCode!=='0')throw Error(`상세주소 ${d.results?.common?.errorCode??'응답 오류'} (별도 승인 범위 확인 필요)`);
    const names=[...new Set((d.results.juso??[]).map((r:any)=>clean(r.dongNm)))].slice(0,10) as string[];
    for(const dong of names){const u=new URL('https://business.juso.go.kr/addrlink/addrDetailApi.do');u.search=new URLSearchParams({...common,searchType:'floorho',dongNm:dong}).toString();const d=await getJson(u);if(d.results?.common?.errorCode!=='0')throw Error(`상세주소 ${d.results?.common?.errorCode??'응답 오류'}`);result.addressRows.push(...(d.results.juso??[]).filter((r:any)=>clean(r.hoNm)).map((r:any)=>({dong:clean(r.dongNm)||dong,ho:clean(r.hoNm),floor:clean(r.floorNm),source:'도로명 상세주소'})));}
   }
  }catch(e){result.addressStatus='error';result.errors.push(e instanceof Error?e.message:'상세주소 조회 오류');}
 }
 // This cache contains only public official address data, never consent edits.
 if(result.registryStatus==='error'&&cached){const old=JSON.parse(cached.payload);if(old.registryStatus==='success'){result.rows=old.rows;result.retainedChecked=old.checked;}}
 await db.prepare('INSERT INTO unit_lookups(parcel,payload,updated) VALUES(?,?,?) ON CONFLICT(parcel) DO UPDATE SET payload=excluded.payload,updated=excluded.updated').bind(parcel,JSON.stringify(result),result.checked).run();
 return result;
}
