const SERVER='https://sinyeong-neighborhood.regal-deer-9246.chatgpt.site';
declare global {interface Window {__SINYEONG_PAGES__?:boolean}}
export const isPages=()=>typeof window!=='undefined'&&window.__SINYEONG_PAGES__===true;
export const assetPath=(path:string)=>isPages()?'/sinyeongdong/'+path.replace(/^\//,''):path;
export const adminPath=()=>isPages()?SERVER+'/signin-with-chatgpt?return_to=%2F':'/signin-with-chatgpt?return_to=%2F';
export async function apiFetch(path:string,init?:RequestInit){
 if(!isPages())return fetch(path,init);
 if(init?.method&&init.method!=='GET')throw Error('GitHub Pages는 조회 전용입니다. 관리자 화면에서 수정해주세요.');
 const endpoint=path==='/api/survey'?'/api/public-survey':path==='/api/lookup'?'/api/public-survey?status=1':null;
 if(!endpoint)throw Error('조회할 수 없는 경로입니다.');
 return fetch(SERVER+endpoint,{...init,credentials:'omit',mode:'cors'});
}
