import {naverInteriorPoints} from './naver-marker-layout';
import {updatedPoints} from './map-points';
import {projectToNaver} from './map-image-registration';
export {projectToNaver,registrationControls} from './map-image-registration';
// Both maps use the same parcel references, including reviewed supplements.
export const naverPoints: Record<string,[number,number]> = Object.fromEntries(
 Object.entries(updatedPoints).map(([parcel,point])=>[parcel,naverInteriorPoints[parcel]??projectToNaver(point)])
);
