import { env } from 'cloudflare:workers';
import { database, guard, failure } from '@/lib/store';
import { candidates } from '@/lib/candidates';
import addressLinks from '@/lib/address-links.json';
import { clean } from '@/lib/housing';
const secrets=()=>env as unknown as {JUSO_API_KEY?:string;BUILDING_API_KEY?:string};
class UpstreamError extends Error { constructor(public service:string,public code:string){super(`${service}: ${code}`);} }
export async function GET(){const e=secrets();return Response.json({address:!!e.JUSO_API_KEY,building:!!e.BUILDING_API_KEY},{headers:{'Cache-Control':'no-store'}});}
async function read(url:URL,service:string){
 let r:Response;
 try{r=await fetch(url,{signal:AbortSignal.timeout(20000)});}catch{throw new UpstreamError(service,'연결 시간 초과 또는 통신 오류');}
 if(!r.ok)throw new UpstreamError(service,`HTTP ${r.status}`);
 try{return await r.json() as any;}catch{throw new UpstreamError(service,'JSON 응답 해석 실패');}
}
async function lookupAddress(c:typeof candidates[number],key:string){
 const output:any[]=[];
 for(let page=1;page<=10;page++){
  const url=new URL('https://business.juso.go.kr/addrlink/addrLinkApi.do');
  url.search=new URLSearchParams({confmKey:key,keyword:`서울특별시 종로구 ${c.dong} ${c.parcel}`,currentPage:String(page),countPerPage:'100',resultType:'json',addInfoYn:'Y'}).toString();
  const data=await read(url,'주소 API');
  if(data.results?.common?.errorCode!=='0')throw new UpstreamError('주소 API',String(data.results?.common?.errorCode??'응답 오류'));
  output.push(...(data.results.juso??[]));
  if(output.length>=Number(data.results.common.totalCount??0))break;
  if(page===10)throw new UpstreamError('주소 API','조회 페이지 한도 초과');
 }
 const [bun,ji='0']=c.parcel.split('-');
 const links=addressLinks.rows.filter(l=>l.lawCode===c.lawCode&&l.parcel===c.parcel);
 return output.filter(r=>r.admCd===c.lawCode&&r.mtYn==='0'&&((Number(r.lnbrMnnm)===Number(bun)&&Number(r.lnbrSlno)===Number(ji))||links.some(l=>l.roadCode===r.rnMgtSn&&Number(l.buildingMain)===Number(r.buldMnnm)&&Number(l.buildingSub)===Number(r.buldSlno)))).map(r=>({road:r.roadAddr,name:clean(r.bdNm),buildingId:r.bdMgtSn,roadCode:r.rnMgtSn,primaryParcel:`${Number(r.lnbrMnnm)}${Number(r.lnbrSlno)?'-'+Number(r.lnbrSlno):''}`,lawCode:r.admCd}));
}
async function lookupTitles(parcel:string,lawCode:string,key:string){
 const [bun,ji='0']=parcel.split('-'),rows:any[]=[];
 for(let page=1;page<=10;page++){
  const u=new URL('https://apis.data.go.kr/1613000/BldRgstHubService/getBrTitleInfo');
  u.search=new URLSearchParams({serviceKey:key,sigunguCd:lawCode.slice(0,5),bjdongCd:lawCode.slice(5),platGbCd:'0',bun:bun.padStart(4,'0'),ji:ji.padStart(4,'0'),numOfRows:'100',pageNo:String(page),_type:'json'}).toString();
  const d=await read(u,'건축HUB');
  if(!['00','0'].includes(String(d.response?.header?.resultCode)))throw new UpstreamError('건축HUB',String(d.response?.header?.resultCode??'응답 오류'));
  let items=d.response.body.items?.item??[];if(!Array.isArray(items))items=[items];rows.push(...items);
  if(rows.length>=Number(d.response.body.totalCount??0))break;
  if(page===10)throw new UpstreamError('건축HUB','조회 페이지 한도 초과');
 }
 return rows.map(r=>({id:String(r.mgmBldrgstPk),name:clean(r.bldNm),dong:clean(r.dongNm),type:clean(r.mainPurpsCdNm),detail:clean(r.etcPurps),households:r.hhldCnt??null,families:r.fmlyCnt??null,main:clean(r.mainAtchGbCdNm),road:clean(r.newPlatPlc),parcel:clean(r.platPlc),queriedParcel:parcel,lawCode,registryKind:clean(r.regstrKindCdNm),registryType:clean(r.regstrGbCdNm),floors:r.grndFlrCnt??null,underground:r.ugrndFlrCnt??null}));
}
export async function POST(req:Request){
 const g=guard(req);if(g)return g;
 try{
  const payload=await req.json() as {parcel?:string};const c=candidates.find(c=>c.parcel===payload.parcel);
  if(!c)return Response.json({error:'조사대장의 지번만 조회할 수 있습니다.'},{status:400});
  const e=secrets();if(!e.JUSO_API_KEY||!e.BUILDING_API_KEY)return Response.json({error:'주소 API와 건축HUB 인증키 설정이 필요합니다.'},{status:503});
  const [addressResult,titleResult]=await Promise.allSettled([lookupAddress(c,e.JUSO_API_KEY),lookupTitles(c.parcel,c.lawCode,e.BUILDING_API_KEY)]);
  const addresses=addressResult.status==='fulfilled'?addressResult.value:[];
  let buildings=titleResult.status==='fulfilled'?titleResult.value:[];
  const errors=[addressResult,titleResult].filter(r=>r.status==='rejected').map(r=>{const error=(r as PromiseRejectedResult).reason;return error instanceof UpstreamError?error.message:'조회 처리 오류';});
  // Only query another parcel when the address API and the supplied linkage data establish the relationship.
  const related=[...new Set(addresses.map(a=>a.primaryParcel))].filter(p=>p!==c.parcel);
  for(const parcel of related.slice(0,5)){
   try{buildings.push(...await lookupTitles(parcel,c.lawCode,e.BUILDING_API_KEY));}catch(err){errors.push(err instanceof UpstreamError?err.message:'관련지번 조회 오류');}
  }
  if(addressResult.status==='rejected'&&titleResult.status==='rejected')return Response.json({error:errors.join(' / ')},{status:502});
  buildings=[...new Map(buildings.map(b=>[b.id,b])).values()];
  const db=database();const previous:any=await db.prepare('SELECT payload FROM lookups WHERE parcel=?').bind(c.parcel).first();
  const old=previous?JSON.parse(previous.payload):null;
  const result={addresses:addressResult.status==='fulfilled'?addresses:(old?.addresses??[]),buildings:titleResult.status==='fulfilled'?buildings:(old?.buildings??[]),checked:new Date().toISOString(),lawCode:c.lawCode,dong:c.dong,errors,addressStatus:addressResult.status==='fulfilled'?'success':'error',buildingStatus:titleResult.status==='fulfilled'?'success':'error',notice:'사용자 제공 빨간 경계를 조사 기준으로 사용합니다. API 결과 없음은 빈 필지·철거를 의미하지 않습니다. 세대수와 가구수는 별도 집계하며, 부속지번은 대표지번과 중복 집계하지 않습니다.'};
  await db.prepare('INSERT INTO lookups(parcel,payload,updated) VALUES(?,?,?) ON CONFLICT(parcel) DO UPDATE SET payload=excluded.payload,updated=excluded.updated').bind(c.parcel,JSON.stringify(result),result.checked).run();
  return Response.json(result);
 }catch(e){return failure(e);}
}
