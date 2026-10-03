export const consentColors:Record<string,string>={'동의':'#16834a','비동의':'#d93232','보류':'#737b87','미조사':'#ffffff'};
export const consentStatuses=['동의','비동의','보류','미조사'];
export function consentSummary(rows:{status:string}[]){
 const counts=Object.fromEntries(consentStatuses.map(s=>[s,rows.filter(r=>r.status===s).length]));
 const active=consentStatuses.filter(s=>counts[s]>0);
 return {counts,total:rows.length,status:active.length>1?'혼재':active[0]??'미조사'};
}
