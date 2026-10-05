import assert from 'node:assert/strict';
import ts from 'typescript';
import fs from 'node:fs';
import vm from 'node:vm';
const modules={};
function load(name){
 if(modules[name])return modules[name];
 const exports={};modules[name]=exports;
 const js=ts.transpileModule(fs.readFileSync(`lib/${name}.ts`,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText;
 vm.runInNewContext(js,{exports,require:p=>load(p.replace('./',''))});
 return exports;
}
const {updatedPoints}=load('map-points');
const {naverPoints,projectToNaver,registrationControls}=load('naver-map-points');
const {supplementalNaverPoints}=load('map-supplement');
const {naverInteriorPoints,naverUnplaced,naverMarkerRadius,naverSafeAreas}=load('naver-marker-layout');
const {candidates,unmappedParcels,reviewParcels}=load('candidates');
assert.deepEqual(Object.keys(naverPoints).sort(),Object.keys(updatedPoints).sort(),'Both map menus must have identical parcel references');
for(const [source,target] of registrationControls){
 const p=projectToNaver(source);
 assert.ok(Math.hypot(p[0]-target[0],p[1]-target[1])<1e-6);
}
for(const [parcel,target] of Object.entries(supplementalNaverPoints)){
 const p=naverPoints[parcel],interior=naverInteriorPoints[parcel];
 assert.ok(interior&&Math.hypot(p[0]-interior[0],p[1]-interior[1])<1e-5,`${parcel}: added reference must use its checked interior location`);
 assert.ok(candidates.some(c=>c.parcel===parcel)&&!unmappedParcels.has(parcel)&&!reviewParcels.has(parcel),`${parcel}: supplemental parcel must be selectable in both menus`);
}
for(const [parcel,[x,y]] of Object.entries(naverPoints))assert.ok(Number.isFinite(x)&&Number.isFinite(y)&&x>=0&&x<=861&&y>=0&&y<=925,`${parcel}: visible image position`);
for(const p of ['214','214-1','214-7','234-4','221-7','235-3'])assert.ok(unmappedParcels.has(p)&&candidates.some(c=>c.parcel===p),`${p}: retain list record without inventing a map position`);
for(const parcel of Object.keys(naverPoints))assert.ok(naverInteriorPoints[parcel]||naverUnplaced[parcel],`${parcel}: visible marker needs an independently checked interior position`);
for(const [parcel,[left,top,right,bottom]] of Object.entries(naverSafeAreas)){const [x,y]=naverPoints[parcel],outer=naverMarkerRadius(parcel)+.375;assert.ok(x-outer>=left&&x+outer<=right&&y-outer>=top&&y+outer<=bottom,`${parcel}: selected marker ring must stay in its checked parcel inset`);}
assert.equal(Object.keys(naverUnplaced).length,5);
const {officialInteriorPoints,sourceUnplaced,sourceMarkerRadius}=load('source-marker-layout');
// Read polygon corners from the enlarged original images, independently of marker positions.
const polygons={naver:[[690,476],[790,420],[801,437],[789,449],[796,480],[773,487],[690,487]],updated:[[436,298],[480,276],[486,281],[478,285],[480,299],[474,302],[436,302]],original:[[1058,743],[1146,692],[1153,705],[1140,715],[1158,744],[1120,751],[1058,751]]};
function distance(p,a,b){const dx=b[0]-a[0],dy=b[1]-a[1],t=Math.max(0,Math.min(1,((p[0]-a[0])*dx+(p[1]-a[1])*dy)/(dx*dx+dy*dy)));return Math.hypot(p[0]-a[0]-t*dx,p[1]-a[1]-t*dy);}
function inside(p,poly){let yes=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++){const a=poly[i],b=poly[j];if((a[1]>p[1])!==(b[1]>p[1])&&p[0]<(b[0]-a[0])*(p[1]-a[1])/(b[1]-a[1])+a[0])yes=!yes;}return yes;}
for(const [source,point,r] of [['naver',naverPoints['223'],naverMarkerRadius('223')+.375],['updated',updatedPoints['223'],sourceMarkerRadius('223',false)+.225],['original',officialInteriorPoints['223'],sourceMarkerRadius('223',true)+.50625]]){const poly=polygons[source];assert.ok(inside(point,poly),`223 ${source}: center inside image polygon`);assert.ok(Math.min(...poly.map((a,i)=>distance(point,a,poly[(i+1)%poly.length])))>r,`223 ${source}: visible edge and inner selection must stay inside parcel`);}
for(const c of candidates.filter(c=>!reviewParcels.has(c.parcel)&&!unmappedParcels.has(c.parcel))){if(!sourceUnplaced[c.parcel]&&officialInteriorPoints[c.parcel])assert.ok(officialInteriorPoints[c.parcel].every(Number.isFinite));}
const css=fs.readFileSync('app/globals.css','utf8'),component=fs.readFileSync('components/survey-map.tsx','utf8');
assert.ok(!css.includes('.parcel-marker:focus-visible>circle'),'Focus must never paint invisible click circles');
assert.ok(css.includes('.marker-hit{stroke:none!important}'),'Hit circles must remain invisible even while focused');
assert.ok(component.includes('className="marker-hit"')&&component.includes('r={radius*.72}'),'Selection and keyboard focus stay inside the visible status circle');
console.log(`PASS: ${Object.keys(naverPoints).length} shared map references, ${Object.keys(supplementalNaverPoints).length} additions; unresolved list records retained.`);
