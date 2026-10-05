import {GET as surveyGET} from '../survey/route';
import {GET as statusGET} from '../lookup/route';
// Public data only. Never forward identity headers or cookies to the owner-aware route.
export async function GET(req:Request){
 const anonymous=new Request(new URL('/api/survey',req.url));
 const response=new URL(req.url).searchParams.get('status')==='1'?await statusGET(new Request(new URL('/api/lookup',req.url))):await surveyGET(anonymous);
 const headers=new Headers(response.headers);
 headers.set('Access-Control-Allow-Origin','https://alex-cho80.github.io');
 headers.set('Vary','Origin');headers.set('Cache-Control','no-store');
 return new Response(response.body,{status:response.status,headers});
}
