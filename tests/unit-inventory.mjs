import ts from 'typescript';
import {readFileSync,writeFileSync,mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
import assert from 'node:assert/strict';
const dir=mkdtempSync(join(tmpdir(),'unit-inventory-'));
try{
 for(const name of ['candidates','housing','unit-inventory','access-policy']){const source=readFileSync(new URL(`../lib/${name}.ts`,import.meta.url),'utf8').replace(/from '(\.\/[^']+)'/g,"from '$1.mjs'");writeFileSync(join(dir,name+'.mjs'),ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText);}
 const {buildInventory}=await import(pathToFileURL(join(dir,'unit-inventory.mjs')));
 const building={id:'1002118471',queriedParcel:'27-10',name:'오성빌라',type:'공동주택',detail:'연립주택',households:6,families:0,dong:'',main:'주건축물'};
 const lookup={parcel:'27-10',buildings:[building],addresses:[]};
 const rows=['101호','102호','201호','202호','301호','302호'].flatMap(ho=>[{ho,dong:'',purpose:'연립주택',ownershipCode:'1',lot:'27-10',source:'건축물대장 전유공용면적'},{ho,dong:'',purpose:'연립주택',ownershipCode:'2',lot:'27-10'}]);
 const catalog={parcel:'27-10',registryStatus:'success',rows:[...rows,{ho:'주차장',purpose:'부대시설',ownershipCode:'1',lot:'27-10'},{ho:'999호',purpose:'연립주택',ownershipCode:'1',lot:'27-8'}]};
 const official=buildInventory([lookup],[catalog]);assert.equal(official.units.length,6);assert.equal(official.summary.official,6);assert.deepEqual(official.units.map(u=>u.unit),['101호','102호','201호','202호','301호','302호']);
 const detailRows=['101호','102호','201호','202호','301호','302호'].map(ho=>({dong:'',ho,primaryParcel:'27-10',source:'도로명 상세주소'}));
 const checkedCatalog={...catalog,catalogVersion:2,addressStatus:'success',addressRows:detailRows};
 const checked=buildInventory([lookup],[checkedCatalog]);assert.equal(checked.units[0].detailCheck,'대장·상세주소 호수 일치');assert.equal(checked.summary.detail.matchedBuildings,1);
 const mismatched=buildInventory([lookup],[{...checkedCatalog,addressRows:detailRows.slice(0,5)}]);assert.equal(mismatched.units[0].detailCheck,'대장·상세주소 호수 대조 필요');assert.equal(mismatched.summary.detail.matchedBuildings,0);
 const failedDetail=buildInventory([lookup],[{...checkedCatalog,addressStatus:'error'}]);assert.equal(failedDetail.summary.detail.errors,1);assert.equal(failedDetail.summary.detail.matchedBuildings,0);
 const oldCache=buildInventory([lookup],[catalog]);assert.equal(oldCache.summary.detail.pending,1);assert.equal(oldCache.summary.detail.matchedBuildings,0);
 const wrongParcel=buildInventory([lookup],[{...checkedCatalog,addressRows:detailRows.map(r=>({...r,primaryParcel:'27-8'}))}]);assert.equal(wrongParcel.summary.detail.matchedBuildings,0);
 const duplicate={...lookup,parcel:'27-8'};assert.equal(buildInventory([lookup,duplicate],[catalog]).units.length,6);
 const conflicting=buildInventory([{...lookup,buildings:[{...building,households:4}]}],[catalog]);assert.equal(conflicting.units.length,6);assert.equal(conflicting.summary.conflicts,1);
 const multi={...lookup,buildings:[{...building,type:'단독주택',detail:'다가구주택',households:2,families:4}]};const provisional=buildInventory([multi],[]);assert.equal(provisional.units.length,4);assert.equal(provisional.units[0].unit,'조사용 1호');
 const detail=buildInventory([{...lookup,buildings:[{...building,type:'단독주택',detail:'다가구용단독주택(7가구)',households:0,families:1}]}],[]);assert.equal(detail.units.length,7);assert.equal(detail.summary.conflicts,1);
 const saved={...provisional.units[0],status:'동의',revision:1};const preserved=buildInventory([multi],[catalog],[saved]);assert.equal(preserved.units.length,4);assert.equal(preserved.units.find(u=>u.id===saved.id).status,'동의');
 const savedOfficial={...official.units[0],status:'비동의',revision:2};assert.equal(buildInventory([lookup],[catalog],[savedOfficial]).units.find(u=>u.id===savedOfficial.id).status,'비동의');
 const zero=buildInventory([{...lookup,buildings:[{...building,households:0}]}],[]);assert.equal(zero.units.length,0);assert.equal(zero.summary.unresolvedBuildings,1);
 const recovered=buildInventory([{parcel:'214-21',buildings:[{...building,id:'recovered',queriedParcel:'214-21',type:'단독주택',detail:'단독주택',households:1,families:2}]}],[]);assert.equal(recovered.units.length,2);
 const {candidates}=await import(pathToFileURL(join(dir,'candidates.mjs')));for(const parcel of ['244','228-3','228-16','221-7'])assert(candidates.some(c=>c.parcel===parcel));
 const {accessFor}=await import(pathToFileURL(join(dir,'access-policy.mjs')));assert.equal(accessFor(new Headers(),'owner@example.com').canEdit,false);assert.equal(accessFor(new Headers({'oai-authenticated-user-id':'test','oai-authenticated-user-email':'viewer@example.com'}),'owner@example.com').canEdit,false);assert.equal(accessFor(new Headers({'oai-authenticated-user-id':'test','oai-authenticated-user-email':'OWNER@example.com'}),'owner@example.com').canEdit,true);
 console.log('PASS: official units, common/nonresidential filtering, parcel aliases, count conflicts, provisional units, saved consent preservation, zero-count housing, anonymous read-only');
 if(process.argv[2]){const {readdirSync}=await import('node:fs');const root=process.argv[2];const lookups=readdirSync(join(root,'collected')).filter(n=>n.endsWith('.json')).map(n=>({parcel:n.replace('.json',''),...JSON.parse(readFileSync(join(root,'collected',n),'utf8'))}));const catalogs=readdirSync(join(root,'unit-catalogs')).filter(n=>n.endsWith('.json')).map(n=>JSON.parse(readFileSync(join(root,'unit-catalogs',n),'utf8')));const live=buildInventory(lookups,catalogs);console.log(JSON.stringify({summary:live.summary,issues:live.issues},null,2));}
}finally{rmSync(dir,{recursive:true,force:true});}
