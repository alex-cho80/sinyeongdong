'use client';
import {useMemo,useRef,useState} from 'react';
import {candidates,parcelLabel,reviewParcels,unmappedParcels} from '@/lib/candidates';
import {sourceParcelLines,sourceRedBoundary} from '@/lib/map-boundaries';
import {updatedPoints} from '@/lib/map-points';
import {buildingName} from '@/lib/housing';
import {unitMatchesParcel} from '@/lib/unit-inventory';
import {consentColors,consentStatuses,consentSummary} from '@/lib/consent';
type Props={selected:string;onSelect:(p:string)=>void;lookups:any[];households:{parcel:string;status:string}[];onShowImage:()=>void};
// Label offsets improve legibility only; leaders always retain the source diagram point.
export function placeLabels(points:{parcel:string;p:number[]}[]){
 const placed:{parcel:string;p:number[];x:number;y:number}[]=[];
 for(const item of [...points].sort((a,b)=>a.p[1]-b.p[1]||a.p[0]-b.p[0])){
  let spot={x:item.p[0],y:item.p[1]};let found=false;
  for(let radius=0;radius<=72&&!found;radius+=6){for(let a=0;a<16&&!found;a++){
   const x=item.p[0]+Math.cos(a*Math.PI/8)*radius,y=item.p[1]+Math.sin(a*Math.PI/8)*radius;
   if(x<163||x>503||y<90||y>505)continue;
   if(!placed.some(v=>Math.abs(v.x-x)<25&&Math.abs(v.y-y)<14)){spot={x,y};found=true;}
  }}
  placed.push({...item,...spot});
 }
 return placed;
}
export function VectorConsentMap({selected,onSelect,lookups,households,onShowImage}:Props){
 const [query,setQuery]=useState(''),[filter,setFilter]=useState('전체'),[zoom,setZoom]=useState(1),[full,setFull]=useState(false),[showLabels,setShowLabels]=useState(true);
 const viewport=useRef<HTMLDivElement>(null),drag=useRef<{x:number;y:number;left:number;top:number}|null>(null);
 const positions=useMemo(()=>placeLabels(candidates.filter(c=>updatedPoints[c.parcel]&&!reviewParcels.has(c.parcel)&&!unmappedParcels.has(c.parcel)).map(c=>({parcel:c.parcel,p:updatedPoints[c.parcel]}))),[]);
 const rows=candidates.map(c=>{const units=households.filter(h=>unitMatchesParcel(h,c.parcel));return {...c,name:buildingName(lookups.find(l=>l.parcel===c.parcel),'명칭 미기재'),summary:consentSummary(units),position:positions.find(p=>p.parcel===c.parcel)};});
 const filtered=rows.filter(c=>(parcelLabel(c.parcel)+' '+c.name).includes(query.trim())&&(filter==='전체'||c.summary.status===filter||!!c.summary.counts[filter]));
 const focus=rows.find(c=>c.parcel===selected);
 function locate(parcel:string){onSelect(parcel);const p=positions.find(c=>c.parcel===parcel);const v=viewport.current;if(p&&v)v.scrollTo({left:(p.x-150)/370*(1050*zoom)-v.clientWidth/2,top:(p.y-75)/440*(1249*zoom)-v.clientHeight/2,behavior:'smooth'});}
 return <section className={'map-panel vector-map '+(full?'vector-expanded':'')} aria-label="선명한 지번별 동의 현황 개략도" onKeyDown={e=>{if(e.key==='Escape')setFull(false);}}>
  <div className="panel-head"><div><h2>구역도에서 보는 동의 현황</h2><p>첨부 원본의 필지 구획 · 지번별 동의 현황</p></div><button onClick={()=>setFull(!full)}>{full?'전체 화면 닫기':'크게 보기'}</button></div>
  <div className="map-toolbar"><button onClick={onShowImage}>첨부 원본 도면 보기</button><div className="map-tools"><button aria-pressed={showLabels} onClick={()=>setShowLabels(!showLabels)}>{showLabels?'지번 상자 숨기기':'지번 상자 표시'}</button><button aria-label="지도 축소" disabled={zoom<=.5} onClick={()=>setZoom(Math.max(.5,zoom-.25))}>−</button><button onClick={()=>{setZoom(1);viewport.current?.scrollTo({left:0,top:0});}}>{Math.round(zoom*100)}%</button><button aria-label="지도 확대" disabled={zoom>=3} onClick={()=>setZoom(Math.min(3,zoom+.25))}>＋</button><button onClick={()=>locate(selected)}>선택 지번으로 이동</button></div></div>
  <div className="map-search"><input aria-label="지도 지번 또는 건물명 검색" placeholder="지번·건물명 검색" value={query} onChange={e=>setQuery(e.target.value)}/><select aria-label="지도 동의 상태" value={filter} onChange={e=>setFilter(e.target.value)}>{['전체',...consentStatuses,'혼재'].map(s=><option key={s}>{s}</option>)}</select><span>{filtered.length}개 지번 · 누르거나 끌어서 이동</span></div>
  <div className="map-legend">{consentStatuses.map(s=><span key={s}><i style={{background:consentColors[s]}}/>{s}</span>)}<span><i className="mixed-swatch"/>혼재</span><span>숫자는 조사 목록 세대수</span></div>
  <div className="vector-workspace"><div className="vector-viewport" ref={viewport} tabIndex={0} aria-label="확대 가능한 구역 개략도" onPointerDown={e=>{if((e.target as Element).closest('[data-parcel]'))return;const v=viewport.current!;drag.current={x:e.clientX,y:e.clientY,left:v.scrollLeft,top:v.scrollTop};e.currentTarget.setPointerCapture(e.pointerId);}} onPointerMove={e=>{if(!drag.current)return;const v=viewport.current!;v.scrollLeft=drag.current.left+drag.current.x-e.clientX;v.scrollTop=drag.current.top+drag.current.y-e.clientY;}} onPointerUp={()=>{drag.current=null;}} onPointerCancel={()=>{drag.current=null;}}>
   <svg width={1050*zoom} height={1249*zoom} viewBox="150 75 370 440" style={{fontFamily:"Arial, 'Noto Sans KR', sans-serif"}} aria-label="도면 기반 지번별 동의 개략도" role="img">
    <rect x="150" y="75" width="370" height="440" fill="#f4f7fa"/>
    <path d={sourceParcelLines} fill="#80909d" aria-label="첨부 원본에서 추출한 필지 및 도로 경계"/>
    <path d={sourceRedBoundary} fill="#dc424b" aria-label="첨부 원본의 붉은 구역 경계"/>
    <text x="158" y="87" fontSize="5" fill="#536579">원본 도면의 구획 · 측량용 아님</text>
    {filtered.filter(c=>c.position).map(c=>{const p=c.position!,active=selected===c.parcel,summary=c.summary;const fill=consentColors[summary.status]??'#fff';return <g key={c.parcel} data-parcel={c.parcel} role="button" tabIndex={0} aria-label={`${parcelLabel(c.parcel)} ${summary.status} ${summary.total}세대`} aria-pressed={active} onClick={()=>onSelect(c.parcel)} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();onSelect(c.parcel);}}} style={{cursor:'pointer'}}>
     <title>{`${parcelLabel(c.parcel)} · ${c.name} · ${summary.status} · ${summary.total?summary.total+'세대':'세대수 미확정'}`}</title>
     {showLabels&&<line x1={p.p[0]} y1={p.p[1]} x2={p.x} y2={p.y} stroke={active?'#0f55b6':'#acbac6'} strokeWidth=".55"/>}<circle cx={p.p[0]} cy={p.p[1]} r={showLabels?1.1:3} fill={showLabels?'#718598':fill} stroke={active?'#064dc4':'#526779'} strokeWidth=".6"/>
     {showLabels&&<>
     <rect x={p.x-12} y={p.y-6} width="24" height="12" rx="2" fill={fill} stroke={active?'#064dc4':'#526779'} strokeWidth={active?1.4:.5}/>
     <text x={p.x} y={p.y-1} textAnchor="middle" fontSize="5" fontWeight="700" fill={['동의','비동의','보류'].includes(summary.status)?'#fff':'#142d43'}>{c.parcel}</text>
     <text x={p.x} y={p.y+3.7} textAnchor="middle" fontSize="4.2" fill={['동의','비동의','보류'].includes(summary.status)?'#fff':'#3f5264'}>{summary.total?summary.total+'세대':'수량 확인'}</text>
     {summary.status==='혼재'&&consentStatuses.filter(s=>summary.counts[s]).map((s,i,arr)=><rect key={s} x={p.x-10+i*20/arr.length} y={p.y+4.5} width={20/arr.length} height="1.2" fill={consentColors[s]}/>)}
     </>}
    </g>;})}
   </svg>
  </div><aside className="vector-results"><h3>지번 찾기 · {filtered.length}</h3>{filtered.map(c=><button key={c.parcel} className={c.parcel===selected?'active':''} onClick={()=>locate(c.parcel)}><strong>{parcelLabel(c.parcel)}</strong><span>{c.summary.total?c.summary.total+'세대 · '+c.summary.status:'세대수 미확정'}</span>{!c.position&&<small>도면 위치 확인 필요</small>}</button>)}</aside></div>
  {focus&&<div className="map-selection" aria-live="polite"><strong>{parcelLabel(focus.parcel)} · {focus.name}</strong><span>동의 {focus.summary.counts['동의']} · 비동의 {focus.summary.counts['비동의']} · 보류 {focus.summary.counts['보류']} · 미조사 {focus.summary.counts['미조사']}</span>{!focus.position&&<span>지번은 목록에 포함돼 있습니다. 도면 위치를 확정하지 않아 임의의 위치에 표시하지 않았습니다.</span>}</div>}
  <div className="map-foot">필지 구획과 붉은 경계는 첨부 원본에서 추출했습니다. 원본 해상도에 따른 끊김·문자 흔적이 남을 수 있습니다. 지번 상자는 가독성을 위해 이동했으며 연결선 끝이 도면의 참고 위치입니다. 구획을 자세히 보려면 지번 상자를 숨겨주세요. 측량용 지적도가 아니며 편입 판단에는 첨부 원본을 사용해주세요. 연결 지번은 같은 건물의 상태를 공유하며 지도에 표시된 수를 합산하지 않습니다.</div>
 </section>;
}
