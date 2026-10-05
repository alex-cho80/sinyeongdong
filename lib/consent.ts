import {consentExclusions} from './consent-exclusions';
export const consentColors:Record<string,string>={'동의':'#16834a','비동의':'#d93232','보류':'#737b87','미조사':'#ffffff','조사제외':'#94a3b8'};
export const consentStatuses=['동의','비동의','보류','미조사'];
export function consentSummary(rows:{status:string}[],parcel?:string){
 const exclusion=parcel?consentExclusions[parcel]:undefined;
 const counted=exclusion?[]:rows;
 const counts=Object.fromEntries(consentStatuses.map(s=>[s,counted.filter(r=>r.status===s).length]));
 const active=consentStatuses.filter(s=>counts[s]>0);
 return {counts,total:counted.length,reason:exclusion??'',status:exclusion?'조사제외':active.length>1?'혼재':active[0]??'미조사'};
}
