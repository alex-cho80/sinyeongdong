'use client';
import {useEffect,useRef,useState} from 'react';
import {Plus,Minus,Maximize2,Minimize2,ExternalLink,Search} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {candidates,parcelLabel,reviewParcels,unmappedParcels} from '@/lib/candidates';
import {buildingName} from '@/lib/housing';
import {consentColors,consentStatuses,consentSummary} from '@/lib/consent';
import {unitMatchesParcel} from '@/lib/unit-inventory';
import {VectorConsentMap} from './vector-consent-map';
import {updatedPoints} from '@/lib/map-points';
type Props={selected:string;onSelect:(parcel:string)=>void;lookups:any[];households:{parcel:string;status:string}[];consent?:boolean};
export function SurveyMap({selected,onSelect,lookups,households,consent=false}:Props){
 const [view,setView]=useState(consent?'vector':'image');
 const [source,setSource]=useState('updated'),[zoom,setZoom]=useState(1),[full,setFull]=useState(false),[search,setSearch]=useState(''),[status,setStatus]=useState('전체'),[labels,setLabels]=useState('선택만'),[failed,setFailed]=useState(false);
 const viewport=useRef<HTMLDivElement>(null);
 useEffect(()=>{if(!full)return;const old=document.body.style.overflow;document.body.style.overflow='hidden';const close=(e:KeyboardEvent)=>{if(e.key==='Escape')setFull(false);};window.addEventListener('keydown',close);return()=>{document.body.style.overflow=old;window.removeEventListener('keydown',close);};},[full]);
 const original=source==='original',width=original?1888:658,height=original?1333:588,path=original?'/plan.jpg':'/plan-updated.png';
 const rows=candidates.filter(c=>!reviewParcels.has(c.parcel)&&!unmappedParcels.has(c.parcel)).map(c=>{const lookup=lookups.find(l=>l.parcel===c.parcel),name=buildingName(lookup,'명칭 미기재'),summary=consentSummary(households.filter(h=>unitMatchesParcel(h,c.parcel)));const p=original?(c.x!==null&&c.y!==null?[c.x,c.y]:undefined):updatedPoints[c.parcel];return {...c,name,summary,p};}).filter(c=>c.p&&(!search||(parcelLabel(c.parcel)+' '+c.name).includes(search.trim()))&&(status==='전체'||c.summary.status===status||(status!=='혼재'&&c.summary.counts[status]>0)));
 const selectedRow=rows.find(c=>c.parcel===selected);
 const unit=original?2.6:1;
 function changeSource(value:string){setSource(value);setFailed(false);setZoom(1);viewport.current?.scrollTo({top:0,left:0});}
 if(consent&&view==='vector')return <VectorConsentMap selected={selected} onSelect={onSelect} lookups={lookups} households={households} onShowImage={()=>setView('image')}/>;
 return <section className={'map-panel survey-map '+(full?'map-expanded':'')} aria-label={consent?'지번별 동의 현황 지도':'조사 대상 구역도'}>
  <div className="panel-head"><div><h2>{consent?'구역도에서 보는 동의 현황':'조사 대상 구역'}</h2><p>붉은 테두리 내부 포함 · 지번 위치를 누르면 상세 현황을 확인합니다.</p></div><Button variant="outline" onClick={()=>setFull(!full)}>{full?<Minimize2 size={16}/>:<Maximize2 size={16}/>} {full?'닫기':'크게 보기'}</Button></div>
  <div className="map-toolbar">{consent&&<button onClick={()=>setView('vector')}>선명한 개략도로 보기</button>}<div className="map-switch"><button aria-pressed={!original} className={!original?'selected':''} onClick={()=>changeSource('updated')}>새 첨부 도면</button><button aria-pressed={original} className={original?'selected':''} onClick={()=>changeSource('original')}>고시 도면 참고</button></div><div className="map-tools"><Button variant="outline" aria-label="도면 축소" disabled={zoom<=1} onClick={()=>setZoom(Math.max(1,zoom-.5))}><Minus size={16}/></Button><button className="zoom-value" onClick={()=>{setZoom(1);viewport.current?.scrollTo({top:0,left:0});}} aria-label="전체 도면 맞춤">{Math.round(zoom*100)}%</button><Button variant="outline" aria-label="도면 확대" disabled={zoom>=4} onClick={()=>setZoom(Math.min(4,zoom+.5))}><Plus size={16}/></Button><a href={path} target="_blank" rel="noreferrer">원본 열기 <ExternalLink size={14}/></a></div></div>
  {consent&&<div className="map-search"><div className="search"><Search size={17}/><Input value={search} onChange={e=>setSearch(e.target.value)} placeholder="지번 또는 건물명 찾기" aria-label="지도 지번·건물명 검색"/></div><select aria-label="지도 동의 상태 필터" value={status} onChange={e=>setStatus(e.target.value)}>{['전체',...consentStatuses,'혼재'].map(s=><option key={s}>{s}</option>)}</select><select aria-label="지도 이름 표시" value={labels} onChange={e=>setLabels(e.target.value)}>{['선택만','지번','건물명'].map(s=><option key={s}>{s}</option>)}</select><span>{rows.length}곳 표시</span></div>}
  {consent&&<div className="map-legend">{consentStatuses.map(s=><span key={s}><i style={{background:consentColors[s],borderStyle:s==='미조사'?'dashed':'solid'}}/>{s}</span>)}<span><i className="mixed-swatch"/>의견 혼재</span></div>}
  <div ref={viewport} className="diagram-viewport"><div className="diagram-canvas" style={{width:`${zoom*100}%`,aspectRatio:`${width}/${height}`}}>
   <img key={path} src={path} alt={original?'종로구 제2025-48호 토지이용계획도 원본':'신영동 214번지 일대 사용자 지정 붉은 경계 구역도'} width={width} height={height} className={original?'official-diagram':''} onError={()=>setFailed(true)} draggable={false}/>
   {!failed&&<svg className="diagram-markers" viewBox={`0 0 ${width} ${height}`} aria-label="지번별 상태 표시">{rows.map(c=>{const [x,y]=c.p!;const active=c.parcel===selected;const {counts,total,status:state}=c.summary;const fill=consent?consentColors[state]??'#fff':active?'#176aaf':'#fff';let offset=0;const radius=5*unit;return <g key={c.parcel} role="button" tabIndex={0} aria-label={`${parcelLabel(c.parcel)} ${c.name} ${consent?state:''}`} aria-pressed={active} onClick={()=>onSelect(c.parcel)} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();onSelect(c.parcel);}}} className="parcel-marker">
    <title>{parcelLabel(c.parcel)} · {c.name}{consent?`\n${state} · 동의 ${counts['동의']} / 비동의 ${counts['비동의']} / 보류 ${counts['보류']} / 미조사 ${counts['미조사']}`:''}</title>
    <circle cx={x} cy={y} r={10*unit} fill="transparent"/>{active&&<circle cx={x} cy={y} r={9*unit} fill="none" stroke="#1564af" strokeWidth={2*unit}/>}
    <circle cx={x} cy={y} r={radius} fill={fill} stroke={active?'#1564af':'#3e5366'} strokeWidth={unit} strokeDasharray={consent&&state==='미조사'?`${2*unit} ${1.5*unit}`:undefined}/>
    {consent&&state==='혼재'&&consentStatuses.filter(s=>counts[s]).map(s=>{const portion=counts[s]/total*100;const start=offset;offset+=portion;return <circle key={s} cx={x} cy={y} r={3.7*unit} pathLength="100" fill="none" stroke={consentColors[s]} strokeWidth={4.8*unit} strokeDasharray={`${portion} ${100-portion}`} strokeDashoffset={-start} transform={`rotate(-90 ${x} ${y})`}/>;})}
    {(active||labels!=='선택만')&&<text x={x} y={y-11*unit} textAnchor="middle" fontSize={8*unit} fontWeight="700" fill="#152c40" stroke="white" strokeWidth={2.5*unit} paintOrder="stroke">{labels==='건물명'&&c.name!=='명칭 미기재'?c.name:c.parcel}</text>}
   </g>;})}</svg>}
   {failed&&<div className="diagram-error" role="alert">도면을 불러오지 못했습니다. <a href={path} target="_blank" rel="noreferrer">원본 도면 열기</a></div>}
  </div></div>
  {consent&&selectedRow&&<div className="map-selection" aria-live="polite"><strong>{parcelLabel(selected)} · {selectedRow.name}</strong><span>{selectedRow.summary.total?`조사 대상 ${selectedRow.summary.total}세대 · 동의 ${selectedRow.summary.counts['동의']} / 비동의 ${selectedRow.summary.counts['비동의']} / 보류 ${selectedRow.summary.counts['보류']} / 미조사 ${selectedRow.summary.counts['미조사']}`:'등록된 동의 조사 결과가 없습니다.'}</span></div>}
  <div className="map-foot">위치는 도면 판독 참고점입니다. 지번 재판독 {reviewParcels.size}곳과 위치 미확정 {unmappedParcels.size}곳은 중복 위치 표시를 피하기 위해 목록에서 확인합니다.{consent?' 미조사는 흰색, 보류는 회색입니다.':''}</div>
 </section>;
}
