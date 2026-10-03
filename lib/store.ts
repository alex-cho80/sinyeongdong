import { env } from 'cloudflare:workers';
export function database(){const db=(env as unknown as {DB?:D1Database}).DB;if(!db)throw new Error('저장소에 연결할 수 없습니다. 잠시 후 다시 시도해주세요.');return db;}
export function failure(e:unknown){console.error('survey_operation_failed', e instanceof Error ? e.name : 'unknown');return Response.json({error:e instanceof Error && e.message.startsWith('저장소')?e.message:'처리하지 못했습니다. 입력 내용을 유지한 채 다시 시도해주세요.'},{status:503});}
export function guard(req:Request){const origin=req.headers.get('origin');if(origin && origin!==new URL(req.url).origin)return Response.json({error:'허용되지 않은 요청입니다.'},{status:403});if(!req.headers.get('content-type')?.includes('application/json'))return Response.json({error:'JSON 요청이 필요합니다.'},{status:415});return null;}
