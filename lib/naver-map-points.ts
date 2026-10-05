import {updatedPoints} from './map-points';

// Parcel identities come exclusively from the survey reference diagram.
// Register its 658 x 588 image to the unchanged 861 x 925 Naver image.
// Reference points are approximate image positions, not cadastral coordinates.
export const registrationControls: [source: [number, number], target: [number, number]][] = [
 [[213,254],[138,381]], [[254,327],[266,539]], [[279,445],[303,823]],
 [[362,343],[510,599]], [[390,338],[578,596]], [[418,117],[634,52]],
 [[274,155],[315,146]], [[474,311],[774,523]], [[368,153],[529,147]],
 [[299,348],[364,607]], [[306,378],[375,670]], [[279,282],[302,449]],
 [[244,290],[211,462]],
];
const triangles = [[6,11,0],[8,5,7],[8,6,5],[6,8,11],[11,12,0],
 [4,8,7],[8,4,11],[2,4,7],[1,12,11],[1,10,2],[1,2,0],[12,1,0],
 [4,3,11],[10,3,2],[3,4,2],[3,9,11],[9,3,10],[9,1,11],[1,9,10]];
export function projectToNaver([x,y]: [number,number]): [number,number] {
 for (const [ia,ib,ic] of triangles) {
  const [a,ta]=registrationControls[ia], [b,tb]=registrationControls[ib], [c,tc]=registrationControls[ic];
  const d=(b[1]-c[1])*(a[0]-c[0])+(c[0]-b[0])*(a[1]-c[1]);
  const wa=((b[1]-c[1])*(x-c[0])+(c[0]-b[0])*(y-c[1]))/d;
  const wb=((c[1]-a[1])*(x-c[0])+(a[0]-c[0])*(y-c[1]))/d, wc=1-wa-wb;
  if (Math.min(wa,wb,wc)>=-1e-9) return [wa*ta[0]+wb*tb[0]+wc*tc[0],wa*ta[1]+wb*tb[1]+wc*tc[1]];
 }
 // Least-squares registration outside the control-point hull.
 return [2.39940047*x-0.00856669894*y-357.727532,0.0569391099*x+2.36788249*y-238.547314];
}
export const naverPoints: Record<string,[number,number]> = Object.fromEntries(
 Object.entries(updatedPoints).map(([parcel,point])=>[parcel,projectToNaver(point)])
);
