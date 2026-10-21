// Supabase Edge Function: API credentials live in Supabase secrets, never in frontend JS.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
const cors={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type','Access-Control-Allow-Methods':'POST, OPTIONS'};
const system=`You are guccigrace, a cautious educational medicine literacy assistant. You are NOT a clinician. Never diagnose, prescribe, recommend personalized dosages, suggest starting/stopping medicines, or invent medicine identification. For images, only transcribe names/strengths if visibly legible; clearly state uncertainty and request pharmacist verification. If text is unclear, say so. Do not infer pill identity from shape or colour alone. Explain general uses, common risks and interactions in accessible language. Never present a medication schedule inferred from an image as confirmed. Encourage checking original prescription and speaking with a qualified clinician/pharmacist. For emergencies or severe symptoms advise urgent local medical care. Reply in the language of the user's question where possible. Do not claim to have verified an image against a medical database.`;
Deno.serve(async req=>{
 if(req.method==='OPTIONS')return new Response('ok',{headers:cors});
 const respond=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{...cors,'Content-Type':'application/json'}});
 if(req.method!=='POST')return respond({error:'Method not allowed'},405);
 try{
  const supabaseUrl=Deno.env.get('SUPABASE_URL')!,anon=Deno.env.get('SUPABASE_ANON_KEY')!;
  const bearer=req.headers.get('Authorization')||'';
  if(!bearer.startsWith('Bearer '))return respond({error:'Login required'},401);
  const sb=createClient(supabaseUrl,anon,{global:{headers:{Authorization:bearer}}});
  const {data:{user},error:userError}=await sb.auth.getUser();
  if(userError||!user)return respond({error:'Invalid session'},401);
  const {data:profile}=await sb.from('profiles').select('role').eq('id',user.id).single();
  if(profile?.role!=='patient')return respond({error:'AI assistant is available to patient accounts'},403);
  const {task,question,image,history=[]}=await req.json();
  if(!['chat','image'].includes(task)||typeof question!=='string'||question.length>2000||!question.trim())return respond({error:'Invalid question'},400);
  if(task==='image'&&(typeof image!=='string'||image.length>7500000||!/^data:image\/(png|jpeg|webp);base64,/.test(image)))return respond({error:'Invalid image; use JPG, PNG or WEBP up to 5 MB'},400);
  const apiKey=Deno.env.get('GEMMA_API_KEY'),model=Deno.env.get('GEMMA_MODEL'),apiUrl=Deno.env.get('GEMMA_API_URL');
  if(!apiKey||!model||!apiUrl)return respond({error:'Gemma API secrets are not configured'},503);
  // OpenAI-compatible chat completions endpoint from your Gemma 4 provider.
  const userContent=task==='image'?[{type:'text',text:question},{type:'image_url',image_url:{url:image}}]:question;
  const prior=Array.isArray(history)?history.slice(-8).filter((x:any)=>['user','ai'].includes(x?.role)&&typeof x?.text==='string').map((x:any)=>({role:x.role==='ai'?'assistant':'user',content:x.text.slice(0,2000)})):[];
  const upstream=await fetch(apiUrl,{method:'POST',headers:{'Authorization':`Bearer ${apiKey}`,'Content-Type':'application/json'},body:JSON.stringify({model,messages:[{role:'system',content:system},...prior,{role:'user',content:userContent}],temperature:0.2,max_tokens:700})});
  if(!upstream.ok){console.error('Gemma upstream status:',upstream.status);return respond({error:`AI provider error (${upstream.status}). Check endpoint, model and provider support for images.`},502)}
  const data=await upstream.json();const answer=data?.choices?.[0]?.message?.content;
  if(typeof answer!=='string')return respond({error:'Unexpected AI provider response'},502);
  return respond({answer});
 }catch(e){console.error(e);return respond({error:'Assistant request failed. Please retry.'},500)}
});
