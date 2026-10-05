import assert from 'node:assert/strict';
import ts from 'typescript';
import fs from 'node:fs';
import vm from 'node:vm';
const modules = {};
for (const name of ['map-points','naver-map-points']) {
 const source=fs.readFileSync(`lib/${name}.ts`,'utf8');
 const js=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText;
 const exports={};
 vm.runInNewContext(js,{exports,require:()=>modules['map-points']});
 modules[name]=exports;
}
const {updatedPoints}=modules['map-points'];
const {naverPoints,projectToNaver,registrationControls}=modules['naver-map-points'];
assert.deepEqual(Object.keys(naverPoints).sort(),Object.keys(updatedPoints).sort(),'Both maps must use the same parcel identities');
for (const [source,target] of registrationControls) {
 const mapped=projectToNaver(source);
 assert.ok(Math.hypot(mapped[0]-target[0],mapped[1]-target[1])<1e-6,'Registration must match its reference locations');
}
for (const [parcel,[x,y]] of Object.entries(naverPoints)) {
 assert.ok(Number.isFinite(x)&&Number.isFinite(y)&&x>=0&&x<=861&&y>=0&&y<=925,`${parcel} must be visible in the unchanged Naver image`);
}
assert.ok(naverPoints['214-24']&&naverPoints['27-13']&&naverPoints['229-1']);
assert.equal(naverPoints['27-20'],undefined,'Naver text must not independently rename survey parcels');
console.log(`Map registration passed: ${Object.keys(naverPoints).length} shared parcels, ${registrationControls.length} reference locations.`);
