'use client';
import {useEffect,useRef,useState} from 'react';
import {Plus,Minus,Maximize2,Minimize2,ExternalLink,Search} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {candidates,parcelLabel,reviewParcels,unmappedParcels} from '@/lib/candidates';
import {buildingName} from '@/lib/housing';
import {consentEligible} from '@/lib/consent-exclusions';
import {consentColors,consentStatuses,consentSummary} from '@/lib/consent';
import {unitMatchesParcel} from '@/lib/unit-inventory';
import {VectorConsentMap} from './vector-consent-map';
import {assetPath} from '@/lib/client-runtime';
import {naverMarkerRadius,naverUnplaced} from '@/lib/naver-marker-layout';
import {naverPoints} from '@/lib/naver-map-points';
import {updatedPoints} from '@/lib/map-points';
import {officialInteriorPoints,sourceUnplaced,sourceMarkerRadius} from '@/lib/source-marker-layout';
import {mapLocationNotes,supplementalNaverPoints} from '@/lib/map-supplement';
type Props={selected:string;onSelect:(parcel:string)=>void;lookups:any[];households:{parcel:string;status:string}[];consent?:boolean};
export function SurveyMap({selected,onSelect,lookups,households,consent=false}:Props){
 const [view,setView]=useState('image');
 const [source,setSource]=useState(consent?'naver':'updated'),[zoom,setZoom]=useState(1),[full,setFull]=useState(false),[search,setSearch]=useState(''),[status,setStatus]=useState('전체'),[labels,setLabels]=useState('선택만'),[failed,setFailed]=useState(false);
 const viewport=useRef<HTMLDivElement>(null);
 useEffect(()=>{if(!full)return;const old=document.body.style.overflow;document.body.style.overflow='hidden';const close=(e:KeyboardEvent)=>{if(e.key==='Escape')setFull(false);};window.addEventListener('keydown',close);return()=>{document.body.style.overflow=old;window.removeEventListener('keydown',close);};},[full]);
 const original=source==='original',naver=source==='naver',width=original?1888:naver?861:658,height=original?1333:naver?925:588,path=assetPath(original?'/plan.jpg':naver?'/plan-naver.png':'/plan-updated.png');
 const rows=candidates.filter(c=>!reviewParcels.has(c.parcel)&&!unmappedParcels.has(c.parcel)&&!(naver?naverUnplaced[c.parcel]:sourceUnplaced[c.parcel])).map(c=>{const lookup=lookups.find(l=>l.parcel===c.parcel),name=buildingName(lookup,'명칭 미기재'),summary=consentSummary(households.filter(h=>consentEligible(h)&&unitMatchesParcel(h,c.parcel)),c.parcel);const p=original?officialInteriorPoints[c.parcel]:naver?naverPoints[c.parcel]:updatedPoints[c.parcel];return {...c,name,summary,p};}).filter(c=>c.p&&(!search||(parcelLabel(c.parcel)+' '+c.name).includes(search.trim()))&&(status==='전체'||c.summary.status===status||(status!=='혼재'&&c.summary.counts[status]>0)));
 const selectedRow=rows.find(c=>c.parcel===selected);
 const missing=candidates.filter(c=>reviewParcels.has(c.parcel)||unmappedParcels.has(c.parcel)||(naver&&!!naverUnplaced[c.parcel])||(!naver&&!!sourceUnplaced[c.parcel])||(original&&!officialInteriorPoints[c.parcel]));
 const apiLabel=(parcel:string)=>{const l=lookups.find(l=>l.parcel===parcel);return !l?'API 미조회':l.errors?.length?'API 오류 · 재확인 필요':l.addresses?.length||l.buildings?.length?'주소·대장 조회 결과 있음':'주소·대장 결과 없음 · 토지 지번 참고';};
 const unit=original?2.6:naver?1.5:1;
 function changeSource(value:string){setSource(value);setFailed(false);setZoom(1);viewport.current?.scrollTo({top:0,left:0});}
 if(consent&&view==='vector')return <VectorConsentMap selected={selected} onSelect={onSelect} lookups={lookups} households={households} onShowImage={()=>{setView('image');changeSource('naver');}}/>;
 return <section className={'map-panel survey-map '+(full?'map-expanded':'')} aria-label={consent?'지번별 동의 현황 지도':'조사 대상 구역도'}>
  <div className="panel-head"><div><h2>{consent?'구역도에서 보는 동의 현황':'조사 대상 구역'}</h2><p>{naver?'네이버 지도 · 지번 구분은 구역·조사대장의 조사 대상 구역 기준입니다.':'붉은 테두리 내부 포함 · 지번 위치를 누르면 상세 현황을 확인합니다.'}</p></div><Button variant="outline" onClick={()=>setFull(!full)}>{full?<Minimize2 size={16}/>:<Maximize2 size={16}/>} {full?'닫기':'크게 보기'}</Button></div>
  <div className="map-toolbar">{consent&&<button onClick={()=>setView('vector')}>선명한 개략도로 보기</button>}<div className="map-switch">{consent&&<button aria-pressed={naver} className={naver?'selected':''} onClick={()=>changeSource('naver')}>네이버 지도</button>}<button aria-pressed={source==='updated'} className={source==='updated'?'selected':''} onClick={()=>changeSource('updated')}>새 첨부 도면</button><button aria-pressed={original} className={original?'selected':''} onClick={()=>changeSource('original')}>고시 도면 참고</button></div><div className="map-tools"><Button variant="outline" aria-label="도면 축소" disabled={zoom<=.25} onClick={()=>setZoom(Math.max(.25,zoom-.25))}><Minus size={16}/></Button><button className="zoom-value" onClick={()=>{setZoom(1);viewport.current?.scrollTo({top:0,left:0});}} aria-label="전체 도면 맞춤">{Math.round(zoom*100)}%</button><Button variant="outline" aria-label="도면 확대" disabled={zoom>=4} onClick={()=>setZoom(Math.min(4,zoom+.25))}><Plus size={16}/></Button><a href={path} target="_blank" rel="noreferrer">원본 열기 <ExternalLink size={14}/></a></div></div>
  {consent&&<div className="map-search"><div className="search"><Search size={17}/><Input value={search} onChange={e=>setSearch(e.target.value)} placeholder="지번 또는 건물명 찾기" aria-label="지도 지번·건물명 검색"/></div><select aria-label="지도 동의 상태 필터" value={status} onChange={e=>setStatus(e.target.value)}>{['전체',...consentStatuses,'혼재','조사제외'].map(s=><option key={s}>{s}</option>)}</select><select aria-label="지도 이름 표시" value={labels} onChange={e=>setLabels(e.target.value)}>{['선택만','지번','건물명'].map(s=><option key={s}>{s}</option>)}</select><span>{rows.length}곳 표시</span></div>}
  {consent&&<div className="map-legend">{consentStatuses.map(s=><span key={s}><i style={{background:consentColors[s],borderStyle:s==='미조사'?'dashed':'solid'}}/>{s}</span>)}<span><i className="mixed-swatch"/>의견 혼재</span><span><i style={{background:consentColors['조사제외']}}/>조사제외</span></div>}
  <div ref={viewport} className="diagram-viewport"><div className="diagram-canvas" style={{width:`${zoom*100}%`,aspectRatio:`${width}/${height}`}}>
   <img key={path} src={path} alt={original?'종로구 제2025-48호 토지이용계획도 원본':naver?'사용자 첨부 네이버 지도, 신영동 214번지 일대 파란 구역 경계':'신영동 214번지 일대 사용자 지정 붉은 경계 구역도'} width={width} height={height} className={original?'official-diagram':''} onError={()=>setFailed(true)} draggable={false}/>
   {!failed&&<svg className="diagram-markers" viewBox={`0 0 ${width} ${height}`} aria-label="지번별 상태 표시">{rows.map(c=>{const [x,y]=c.p!;const active=c.parcel===selected;const {counts,total,status:state}=c.summary;const fill=state==='조사제외'?consentColors['조사제외']:consent?consentColors[state]??'#fff':active?'#176aaf':'#fff';let offset=0;const radius=naver?naverMarkerRadius(c.parcel):sourceMarkerRadius(c.parcel,original);return <g key={c.parcel} role="button" tabIndex={0} aria-label={`${parcelLabel(c.parcel)} ${c.name} ${consent?state:''}`} aria-pressed={active} onClick={()=>onSelect(c.parcel)} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();onSelect(c.parcel);}}} className="parcel-marker">
    <title>{parcelLabel(c.parcel)} · {c.name}{c.summary.reason?`\n조사제외 · ${c.summary.reason}`:''}{supplementalNaverPoints[c.parcel]?`\n네이버 지도 위치 대조 · ${apiLabel(c.parcel)}`:''}{consent?`\n${state} · 동의 ${counts['동의']} / 비동의 ${counts['비동의']} / 보류 ${counts['보류']} / 미조사 ${counts['미조사']}`:''}</title>
    <circle className="marker-hit" cx={x} cy={y} r={Math.max(radius,4*unit)} fill="transparent" stroke="none"/>
    <circle className="marker-status" cx={x} cy={y} r={radius} fill={fill} stroke={active?'#1564af':'#3e5366'} strokeWidth={Math.min(unit,radius*.25)} strokeDasharray={consent&&state==='미조사'?`${2*unit} ${1.5*unit}`:undefined}/>
    {consent&&state==='혼재'&&consentStatuses.filter(s=>counts[s]).map(s=>{const portion=counts[s]/total*100;const start=offset;offset+=portion;return <circle key={s} cx={x} cy={y} r={radius*.65} pathLength="100" fill="none" stroke={consentColors[s]} strokeWidth={radius*.7} strokeDasharray={`${portion} ${100-portion}`} strokeDashoffset={-start} transform={`rotate(-90 ${x} ${y})`}/>;})}
    <circle className={active?'marker-selection':'marker-focus'} cx={x} cy={y} r={radius*.72} fill="none" stroke="#1564af" strokeWidth={radius*.3} pointerEvents="none"/>
    {(active||labels!=='선택만')&&<text x={x} y={y-11*unit} textAnchor="middle" fontSize={8*unit} fontWeight="700" fill="#152c40" stroke="white" strokeWidth={2.5*unit} paintOrder="stroke">{labels==='건물명'&&c.name!=='명칭 미기재'?c.name:c.parcel}</text>}
   </g>;})}</svg>}
   {failed&&<div className="diagram-error" role="alert">도면을 불러오지 못했습니다. <a href={path} target="_blank" rel="noreferrer">원본 도면 열기</a></div>}
  </div></div>
  {consent&&selectedRow&&<div className="map-selection" aria-live="polite"><strong>{parcelLabel(selected)} · {selectedRow.name}</strong><span>{selectedRow.summary.reason?`조사제외 · ${selectedRow.summary.reason}`:selectedRow.summary.total?`조사 대상 ${selectedRow.summary.total}세대 · 동의 ${selectedRow.summary.counts['동의']} / 비동의 ${selectedRow.summary.counts['비동의']} / 보류 ${selectedRow.summary.counts['보류']} / 미조사 ${selectedRow.summary.counts['미조사']}`:'등록된 조사 세대가 없습니다. 세대수 확인이 필요합니다.'}</span>{supplementalNaverPoints[selected]&&<span>네이버 지도 위치 대조 · {apiLabel(selected)}{mapLocationNotes[selected]?' · '+mapLocationNotes[selected]:''}</span>}</div>}
  <details className="map-foot"><summary>지도 위치 확인이 필요한 {missing.length}개 지번 · 조사 목록은 유지됩니다</summary><div>{missing.map(c=><p key={c.parcel}><button type="button" onClick={()=>onSelect(c.parcel)}>{parcelLabel(c.parcel)}</button> · {(naver?naverUnplaced[c.parcel]:sourceUnplaced[c.parcel])??mapLocationNotes[c.parcel]??'고시 도면의 표시 좌표가 없습니다. 새 첨부 도면 또는 네이버 지도에서 확인해주세요.'}</p>)}</div></details>
  <div className="map-foot">{naver?'지번 구분은 조사 대상 구역과 동일합니다. 동그라미는 네이버 이미지의 구획 안쪽으로 맞추고, 좁은 구획은 표시 크기를 줄였습니다. 선택·키보드 강조 테두리도 원 안쪽에 표시합니다.':'위치는 도면 판독 참고점입니다.'} 서울시 매입 부지·전기차 충전소는 회색 조사제외로 표시합니다. 주소·대장 결과가 없는 토지 지번도 지도 판독 참고점으로 표시하며, 세대수를 임의로 만들지 않습니다. 위치가 불명확한 지번은 위 확인 목록에 남깁니다.{consent?' 미조사는 흰색, 보류는 회색입니다.':''}</div>
 </section>;
}
