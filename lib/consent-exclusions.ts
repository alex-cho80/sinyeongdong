// User field report, 2026-10-05. Consent eligibility is independent of
// district inclusion and saved consent/visit history. No ownership API claim.
export const consentExclusions: Record<string,string> = {
 '225-1':'서울시 매입 부지',
 '214-20':'서울시 매입 부지',
 '214-106':'서울시 매입 부지',
 '214-29':'전기차 충전소',
};
export function exclusionReason(unit:{parcel:string;parcels?:string[]}):string {
 return consentExclusions[unit.parcel] || (unit.parcels??[]).map(p=>consentExclusions[p]).find(Boolean) || '';
}
export function consentEligible(unit:{parcel:string;parcels?:string[]}):boolean {return !exclusionReason(unit);}
