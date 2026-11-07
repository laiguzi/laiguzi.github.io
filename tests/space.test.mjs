import test from 'node:test';
import assert from 'node:assert/strict';
import {summarize,weeklyMinutes,csvCell} from '../space/model.js';
import {configured,PrivateAPI} from '../space/api.js';
test('monthly totals isolate currency and month, and avoid decimal drift',()=>{
  const entries=[
    {date:'2026-11-01',currency:'EUR',type:'expense',amount:0.1},
    {date:'2026-11-02',currency:'EUR',type:'expense',amount:0.2},
    {date:'2026-11-01',currency:'EUR',type:'income',amount:20},
    {date:'2026-11-01',currency:'CNY',type:'expense',amount:100},
    {date:'2026-10-31',currency:'EUR',type:'expense',amount:100}
  ];
  assert.deepEqual(summarize(entries,'2026-11','EUR'),{income:20,expense:0.3,balance:19.7});
});
test('week starts Monday and excludes later dates and prior Sunday',()=>{
  const sessions=[{date:'2026-11-01',minutes:100},{date:'2026-11-02',minutes:20},{date:'2026-11-06',minutes:30},{date:'2026-11-07',minutes:100}];
  assert.equal(weeklyMinutes(sessions,new Date(2026,10,6)),50);
});
test('CSV values quote delimiters and neutralize spreadsheet formulas',()=>{
  assert.equal(csvCell('a,"b"'),'"a,""b"""');
  assert.equal(csvCell(' =HYPERLINK("x")'),'"\' =HYPERLINK(""x"")"');
  assert.equal(csvCell(12.5),'"12.5"');
});
test('unconfigured deployment fails closed without network requests',async()=>{
  const settings={supabaseUrl:"",publishableKey:""};
  assert.equal(configured(settings),false);
  const before=globalThis.fetch;let called=false;
  globalThis.fetch=async()=>{called=true;throw new Error('must not run');};
  try {await assert.rejects(new PrivateAPI(settings).sendLoginLink('nobody@example.com'),/尚未连接/);assert.equal(called,false);}
  finally {globalThis.fetch=before;}
});

test('browser rejects secret keys',()=>{
  assert.equal(configured({supabaseUrl:'https://example.supabase.co',publishableKey:'sb_secret_forbidden'}),false);
});
test('refresh is shared across concurrent reads and uses the new access token',async()=>{
  const settings={supabaseUrl:'https://example.supabase.co',publishableKey:'sb_publishable_test'};
  const api=new PrivateAPI(settings);api.session={access_token:'old',refresh_token:'refresh',expires_at:0,user:{id:'owner'}};
  const before=globalThis.fetch;let refreshes=0;
  globalThis.fetch=async(url,options)=>{
    assert.equal(options.headers.apikey,settings.publishableKey);
    if(url.includes('grant_type=refresh_token')){
      refreshes++;return new Response(JSON.stringify({access_token:'new',refresh_token:'new-refresh',expires_in:3600,user:{id:'owner'}}));
    }
    throw new Error('Unexpected request');
  };
  try{assert.deepEqual(await Promise.all([api.token(),api.token(),api.token()]),['new','new','new']);assert.equal(refreshes,1);}
  finally{globalThis.fetch=before;}
});

test('login link tokens are validated against Auth before session is accepted',async()=>{
  const api=new PrivateAPI({supabaseUrl:'https://example.supabase.co',publishableKey:'sb_publishable_test'});
  const before=globalThis.fetch;globalThis.fetch=async()=>new Response('{}',{status:401});
  try{await assert.rejects(api.acceptLoginLink('invalid','invalid',3600));assert.equal(api.session,null);}
  finally{globalThis.fetch=before;}
});
