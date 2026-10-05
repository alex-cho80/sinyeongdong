import assert from 'node:assert/strict';
import ts from 'typescript';
import fs from 'node:fs';
import vm from 'node:vm';
const modules={};
function load(name){if(modules[name])return modules[name];const exports={};modules[name]=exports;vm.runInNewContext(ts.transpileModule(fs.readFileSync(`lib/${name}.ts`,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{exports,require:p=>load(p.replace('./',''))});return exports;}
const {consentEligible,consentExclusions}=load('consent-exclusions');
const {consentSummary,consentColors}=load('consent');
const {buildInventory}=load('unit-inventory');
const saved=['225-1','214-20','214-106','214-29','214-27'].map((parcel,i)=>({id:`saved-${i}`,parcel,building:'기존 기록',unit:'101호',status:['동의','비동의','보류','미조사','동의'][i],revision:3,visitStatus:'방문 완료',ownerStatus:'확인 완료'}));
const before=JSON.stringify(saved);
const result=buildInventory([],[],saved);
assert.equal(result.summary.total,5);
assert.equal(result.summary.consentTotal,1);
assert.equal(result.summary.excludedUnits,4);
assert.equal(saved.filter(consentEligible).length,1);
assert.equal(consentEligible({parcel:'225-2',parcels:['225-1','225-2']}),false,'Connected parcel must not count the excluded building twice');
for(const old of saved){const u=result.units.find(u=>u.id===old.id);for(const k of ['status','revision','visitStatus','ownerStatus'])assert.equal(u[k],old[k]);}
assert.equal(JSON.stringify(saved),before,'Exclusion must never rewrite stored records');
for(const parcel of Object.keys(consentExclusions)){const s=consentSummary(saved,parcel);assert.equal(s.status,'조사제외');assert.equal(s.total,0);assert.equal(s.counts['보류'],0);assert.equal(s.reason,consentExclusions[parcel]);}
assert.notEqual(consentColors['보류'],consentColors['조사제외']);
assert.equal(consentSummary([saved[4]],'214-27').counts['동의'],1);
console.log('PASS: four exclusions, separate map status, denominator and alias handling; consent/visit history unchanged');
