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
for(const [parcel,[left,top,right,bottom]] of Object.entries(naverSafeAreas)){const [x,y]=naverPoints[parcel],outer=naverMarkerRadius(parcel)+1.5;assert.ok(x-outer>=left&&x+outer<=right&&y-outer>=top&&y+outer<=bottom,`${parcel}: selected marker ring must stay in its checked parcel inset`);}
assert.equal(Object.keys(naverUnplaced).length,4);
console.log(`PASS: ${Object.keys(naverPoints).length} shared map references, ${Object.keys(supplementalNaverPoints).length} additions; unresolved list records retained.`);
