import { useEffect, useState, type FormEvent } from 'react';
import { Navigate } from 'react-router-dom';
import type { Backend, OwnerDataSource, OwnerIdentity, OwnerSessionState } from '../types';
import type { Business } from '../../lib/types';
import { createHttpChatClient } from '../http/chatClient';

async function request<T>(path:string, body?:unknown):Promise<T> {
  const res=await fetch(`/api/${path}`,{credentials:'same-origin',...(body===undefined ? {} : {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)})});
  const value=await res.json();if(!res.ok) throw new Error(value.error ?? 'Request failed.');return value;
}
let session:OwnerSessionState={status:'loading'};
const listeners=new Set<()=>void>();
function emit() {for(const l of listeners) l();}
async function refresh(){try{session={status:'signedIn',identity:await request<OwnerIdentity>('auth/session')};}catch{session={status:'signedOut'};}emit();}
function useSession(){const [value,set]=useState(session);useEffect(()=>{const listener=()=>set(session);listeners.add(listener);void refresh();return()=>{listeners.delete(listener);};},[]);return value;}
function SignIn(){
  const state=useSession();const [email,setEmail]=useState('');const [password,setPassword]=useState('');const [error,setError]=useState('');const [busy,setBusy]=useState(false);
  if(state.status==='signedIn') return <Navigate to="/owner" replace/>;
  async function submit(e:FormEvent){e.preventDefault();setBusy(true);setError('');try{session={status:'signedIn',identity:await request<OwnerIdentity>('auth/login',{email,password})};emit();}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
  return <main className="mx-auto max-w-md px-6 py-16"><h1 className="text-2xl font-semibold">Owner sign-in</h1><p className="mt-3 text-sm text-slate-600">Real server authentication. First-run sample passwords are printed in your backend terminal. The assistant uses approved FAQ matching, with no paid AI model.</p><form onSubmit={submit} className="mt-6 space-y-4"><label className="block">Email<input className="mt-1 w-full rounded border p-3" type="email" required autoComplete="username" value={email} onChange={e=>setEmail(e.target.value)}/></label><label className="block">Password<input className="mt-1 w-full rounded border p-3" type="password" required autoComplete="current-password" value={password} onChange={e=>setPassword(e.target.value)}/></label>{error && <p role="alert" className="text-red-700">{error}</p>}<button disabled={busy} className="rounded bg-indigo-600 px-4 py-3 text-white">{busy?'Signing in…':'Sign in'}</button></form></main>;
}
export const backend:Backend={
  mode:'server',useOwnerSession:useSession,SignInScreen:SignIn,
  async signOut(){await request('auth/logout',{});session={status:'signedOut'};emit();},
  createOwnerData(){return new Proxy({} as OwnerDataSource,{get:(_target,operation)=>(...args:unknown[])=>request('owner',{operation,args})});},
  subscribeToChanges(listener){const timer=setInterval(listener,5000);return()=>clearInterval(timer);},
  useDemoBusinesses(){const [businesses,set]=useState<Business[]>([]);useEffect(()=>{void request<Business[]>('businesses').then(set).catch(()=>set([]));},[]);return businesses;},
  chat:createHttpChatClient('/api/chat'),
};
