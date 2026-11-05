import {PrivateAPI, configured} from './api.js?v=b5fa3c5abf5f';
import {summarize, money, weeklyMinutes, demoData, monthKey, todayKey, csvCell} from './model.js?v=bd8ba09145bf';
const $ = id => document.getElementById(id);
const api = new PrivateAPI();
const emptyData = () => ({learning_goals: [], study_sessions: [], finance_entries: [], monthly_budgets: []});
const state = {demo: false, data: emptyData(), version: 0, busy: false, view: 'overview'};
let loginEmail = '', cooldownUntil = 0;
function element(tag, text, className) {
  const e = document.createElement(tag); if (text !== undefined) e.textContent = text; if (className) e.className = className; return e;
}
function message(text = '', error = false, auth = false) {
  const e = $(auth ? 'auth-message' : 'app-message'); e.textContent = text; e.classList.toggle('error', error);
}
function defaults() {
  for (const id of ['study-date', 'entry-date']) $(id).value = todayKey();
  $('finance-month').value = monthKey();
}
function view(name) {
  if (!['overview','learning','finance'].includes(name)) return;
  state.view = name;
  for (const n of ['overview','learning','finance']) $('view-' + n).hidden = n !== name;
  document.querySelectorAll('.sidebar [data-view]').forEach(b => {
    if (b.dataset.view === name) b.setAttribute('aria-current','page'); else b.removeAttribute('aria-current');
  });
  $('page-title').textContent = {overview:'今日总览',learning:'学习空间',finance:'理财空间'}[name];
  message();
}
function cleanForms() {
  for (const id of ['goal-form','study-form','entry-form','budget-form']) {
    const f = $(id); f.reset(); delete f.dataset.editId;
    f.querySelector('[data-cancel]')?.remove();
    const submit = f.querySelector('[type=submit]'); if (submit?.dataset.original) submit.textContent = submit.dataset.original;
  }
  defaults();
}
function lock() {
  state.version++; state.demo = false; state.busy = false; state.data = emptyData();
  $('workspace').hidden = true; $('gate').hidden = false;
  cleanForms();
  for (const id of ['goals-list','study-list','ledger-body','overview-goals','overview-entries']) $(id).replaceChildren();
  for (const id of ['stat-goals','stat-time','stat-spend','income-total','expense-total','balance-total']) $(id).textContent = '—';
  $('budget-status').textContent = ''; $('budget-detail').textContent = ''; $('account-label').textContent = '';
  $('code').value = ''; $('code-form').hidden = true; $('email-form').hidden = false;
  render(); window.scrollTo(0, 0);
  document.querySelectorAll('#workspace button').forEach(b => b.disabled = false);
}
function enter(demo) {
  state.demo = demo; $('gate').hidden = true; $('workspace').hidden = false;
  $('demo-notice').hidden = !demo;
  $('account-label').textContent = demo ? '虚构数据演示' : api.session.user.email;
  $('logout').textContent = demo ? '结束演示 ↗' : '退出登录 ↗';
  $('date-label').textContent = new Intl.DateTimeFormat('zh-CN',{dateStyle:'full'}).format(new Date());
  cleanForms(); view('overview'); render(); window.scrollTo(0, 0);
}
function listItem(title, meta, action) {
  const row = element('div', undefined, 'item'); const main = element('div', undefined, 'item-main');
  main.append(element('p',title),element('small',meta)); row.append(main); if (action) row.append(action); return row;
}
function empty(container, text) { container.append(element('p',text,'empty')); }
function actionButton(label, handler) {
  const b = element('button',label,'secondary'); b.type='button'; b.addEventListener('click',handler); return b;
}
function sorted(list, field = 'date') { return [...list].sort((a,b) => String(b[field] || '').localeCompare(String(a[field] || ''))); }
function render() {
  const data = state.data, month = $('finance-month').value, currency = $('currency').value;
  const totals = summarize(data.finance_entries,month,currency);
  const active = data.learning_goals.filter(g => g.status === 'active');
  $('stat-goals').textContent = active.length;
  $('stat-time').textContent = weeklyMinutes(data.study_sessions) + ' 分钟';
  $('stat-spend').textContent = money(summarize(data.finance_entries,monthKey(),currency).expense,currency);
  $('stat-currency').textContent = monthKey() + ' · ' + currency + '，不含其他币种';
  const overviewGoals = $('overview-goals'); overviewGoals.replaceChildren();
  if (!active.length) empty(overviewGoals,'从一个小目标开始。');
  [...active].sort((a,b)=>(a.target_date || '9999').localeCompare(b.target_date || '9999')).slice(0,4)
    .forEach(g=>overviewGoals.append(listItem(g.title,[g.category,g.target_date || '未设日期'].join(' · '))));
  const overviewEntries = $('overview-entries'); overviewEntries.replaceChildren();
  if (!data.finance_entries.length) empty(overviewEntries,'尚未记录收支。');
  sorted(data.finance_entries).slice(0,4).forEach(e=>overviewEntries.append(listItem(e.category,e.date,element('span',(e.type === 'income'?'+':'−') + money(e.amount,e.currency),'amount'))));
  const goals = $('goals-list'); goals.replaceChildren();
  const filter = $('goal-filter').value;
  const selected = data.learning_goals.filter(g=>filter==='all'||g.status===filter);
  if (!selected.length) empty(goals,'这里还没有目标。');
  selected.forEach(g=>{
    const actions = element('div');
    actions.append(actionButton(g.status==='done'?'恢复':'完成',()=>run(async()=>{
      await save('learning_goals',{status:g.status==='done'?'active':'done'},g.id); message('目标已更新。');
    })),actionButton('修改',()=>edit('goal-form',g)));
    goals.append(listItem(g.title,[g.category,g.target_date || '未设日期',g.status==='done'?'已完成':'进行中'].join(' · '),actions));
  });
  const studies = $('study-list'); studies.replaceChildren();
  if (!data.study_sessions.length) empty(studies,'记录下一次专注吧。');
  sorted(data.study_sessions).slice(0,30).forEach(s=>studies.append(listItem(s.subject,`${s.date} · ${s.minutes} 分钟${s.note?' · '+s.note:''}`,actionButton('修改',()=>edit('study-form',s)))));
  $('income-total').textContent = money(totals.income,currency);
  $('expense-total').textContent = money(totals.expense,currency);
  $('balance-total').textContent = money(totals.balance,currency);
  const budget = data.monthly_budgets.find(b=>b.month===month && b.currency===currency);
  $('budget-status').textContent = budget ? `${month} · ${money(budget.amount,currency)}` : `${month} · ${currency} 尚未设置预算`;
  $('budget-progress').value = budget ? Math.min(100,totals.expense/Number(budget.amount)*100) : 0;
  $('budget-detail').textContent = budget ? (Number(budget.amount)>=totals.expense?'剩余 ':'已超出 ') + money(Math.abs(Number(budget.amount)-totals.expense),currency) : '设置后可查看预算使用情况。';
  const entries = sorted(data.finance_entries.filter(e=>e.date.startsWith(month+'-') && e.currency===currency));
  const body = $('ledger-body'); body.replaceChildren();
  $('ledger-empty').hidden = entries.length > 0; $('ledger-count').textContent = entries.length+' 条记录';
  entries.forEach(e=>{
    const row=element('tr'), category=element('td');
    category.append(element('div',e.category),element('div',e.note,'record-note'));
    const amount=element('td'); amount.append(element('div',money(e.amount,e.currency)),actionButton('修改',()=>edit('entry-form',e)));
    row.append(element('td',e.date),category,element('td',e.type==='income'?'收入':'支出'),amount);body.append(row);
  });
}
async function reload() {
  const version = state.version;
  if (state.demo) { render(); return; }
  if (!(await api.owner())) { api.clear(); lock(); throw new Error('此账号没有个人空间访问权限。'); }
  const data = await api.load();
  if (version !== state.version) return;
  state.data = data; render();
}
async function run(task) {
  if (state.busy) return;
  state.busy = true;
  const version=state.version;
  const buttons=[...document.querySelectorAll('#workspace button')].filter(b=>b.id!=='logout' && b.id!=='end-demo');
  buttons.forEach(b=>b.disabled=true); message('正在保存或同步…');
  try { await task(); }
  catch(error) {
    if (!state.demo && !api.session) lock();
    message(error.message,true,$('workspace').hidden);
  } finally {
    if (state.version===version) {state.busy=false;buttons.forEach(b=>b.disabled=false);}
  }
}
async function save(table, record, id) {
  const version=state.version;
  if (state.demo) {
    const list=state.data[table];
    if (id) Object.assign(list.find(x=>x.id===id),record);
    else list.unshift({...record,id:crypto.randomUUID()});
    render();return;
  }
  await api.write(table,record,id);
  if (version===state.version) await reload();
}
function edit(formId, record) {
  const form=$(formId);form.dataset.editId=record.id;
  for(const input of form.elements) if(input.name && Object.hasOwn(record,input.name)) input.value=record[input.name] ?? '';
  const submit=form.querySelector('[type=submit]');submit.dataset.original ||= submit.textContent;submit.textContent='保存修改';
  if(!form.querySelector('[data-cancel]')) {
    const cancel=actionButton('取消修改',()=>resetForm(form));cancel.dataset.cancel='true';form.append(cancel);
  }
  form.scrollIntoView({block:'center'});form.querySelector('input')?.focus({preventScroll:true});
}
function resetForm(form) {
  form.reset();delete form.dataset.editId;form.querySelector('[data-cancel]')?.remove();
  const submit=form.querySelector('[type=submit]');if(submit.dataset.original)submit.textContent=submit.dataset.original;
  if(form.id==='study-form')$('study-date').value=todayKey();
  if(form.id==='entry-form'){$('entry-date').value=todayKey();$('entry-currency').value=$('currency').value;}
}
function wireForm(id, table, parse) {
  $(id).addEventListener('submit',event=>{
    event.preventDefault(); const form=event.currentTarget;
    run(async()=>{
      const record=parse(Object.fromEntries(new FormData(form)));
      await save(table,record,form.dataset.editId);
      if (!$('workspace').hidden) {resetForm(form);message(state.demo?'演示记录已更新，离开页面后清空。':'已保存。');}
    });
  });
}
function requiredText(value,max) { const s=String(value||'').trim();if(!s||s.length>max)throw new Error('请填写有效内容。');return s; }
function amount(value) {const n=Number(value);if(!Number.isFinite(n)||n<=0||n>999999999.99)throw new Error('请输入有效的正数金额。');return Math.round(n*100)/100;}
function date(value) {if(!/^\d{4}-\d{2}-\d{2}$/.test(value))throw new Error('请选择有效日期。');return value;}
wireForm('goal-form','learning_goals',f=>({title:requiredText(f.title,160),category:f.category,target_date:f.target_date?date(f.target_date):null,...($('goal-form').dataset.editId?{}:{status:'active'})}));
wireForm('study-form','study_sessions',f=>{
  const minutes=Number(f.minutes);if(!Number.isInteger(minutes)||minutes<1||minutes>1440)throw new Error('学习时长应在 1–1440 分钟之间。');
  return {subject:requiredText(f.subject,160),date:date(f.date),minutes,note:f.note.trim()};
});
wireForm('entry-form','finance_entries',f=>({date:date(f.date),type:f.type,amount:amount(f.amount),currency:f.currency,category:f.category,note:f.note.trim()}));
$('budget-form').addEventListener('submit',event=>{
  event.preventDefault();run(async()=>{
    const month=$('finance-month').value,currency=$('currency').value;
    if(!/^\d{4}-\d{2}$/.test(month))throw new Error('请选择月份。');
    const existing=state.data.monthly_budgets.find(b=>b.month===month&&b.currency===currency);
    await save('monthly_budgets',{month,currency,amount:amount($('budget-amount').value)},existing?.id);message('预算已保存。');
  });
});
for (const b of document.querySelectorAll('[data-view]')) b.addEventListener('click',()=>view(b.dataset.view));
for (const id of ['finance-month','currency','goal-filter']) $(id).addEventListener('change',()=>{
  if(!$('finance-month').value)$('finance-month').value=monthKey();
  $('budget-amount').value='';render();
});
$('refresh').addEventListener('click',()=>run(async()=>{await reload();message(state.demo?'演示模式不连接私人数据库。':'已同步最新记录。');}));
$('try-demo').addEventListener('click',()=>{api.clear();state.version++;state.data=demoData();enter(true);});
async function logout() {
  const demo=state.demo;lock();message('',false,true);
  try {if(!demo)await api.logout();}
  catch {message('本页登录信息已清除；服务器退出请求未完成，请稍后重试登录。',true,true);}
}
$('logout').addEventListener('click',logout);$('end-demo').addEventListener('click',logout);
$('email-form').addEventListener('submit',async event=>{
  event.preventDefault();if(Date.now()<cooldownUntil)return;
  const button=$('send-code');button.disabled=true;message('正在发送验证码…',false,true);
  try {
    loginEmail=$('email').value.trim();await api.sendCode(loginEmail);cooldownUntil=Date.now()+60000;
    $('email-form').hidden=true;$('code-form').hidden=false;message('若该邮箱已获授权，你会收到登录验证码。',false,true);$('code').focus();
    setTimeout(()=>{button.disabled=!configured();},60000);
  }catch(error){message(error.message,true,true);button.disabled=!configured();}
});
$('change-email').addEventListener('click',()=>{$('code-form').hidden=true;$('email-form').hidden=false;message('可修改邮箱；再次发送需间隔至少 60 秒。',false,true);});
$('code-form').addEventListener('submit',async event=>{
  event.preventDefault();const button=$('code-form').querySelector('[type=submit]');button.disabled=true;
  message('正在验证身份…',false,true);
  try {
    await api.verify(loginEmail,$('code').value.trim());
    if(!(await api.owner())){api.clear();throw new Error('此账号没有个人空间访问权限。');}
    const data=await api.load();state.version++;state.data=data;enter(false);message('',false,true);$('code').value='';
  }catch(error){api.clear();message(error.message,true,true);}finally{button.disabled=false;}
});
$('export').addEventListener('click',()=>{
  const month=$('finance-month').value,currency=$('currency').value;
  const rows=[['日期','类型','金额','币种','分类','备注'],...sorted(state.data.finance_entries.filter(e=>e.date.startsWith(month+'-')&&e.currency===currency)).map(e=>[e.date,e.type==='income'?'收入':'支出',e.amount,e.currency,e.category,e.note])];
  const blob=new Blob(['\uFEFF'+rows.map(row=>row.map(csvCell).join(',')).join('\r\n')],{type:'text/csv;charset=utf-8'});
  const url=URL.createObjectURL(blob),a=element('a');a.href=url;a.download=`${state.demo?'demo-':''}finance-${month}-${currency}.csv`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
});
defaults();$('setup-note').hidden=configured();$('send-code').disabled=!configured();$('email').disabled=!configured();
if(await api.restore()) {
  try {
    if(!(await api.owner()))throw new Error('此账号没有个人空间访问权限。');
    state.data=await api.load();enter(false);
  }catch(error){api.clear();lock();message(error.message,true,true);}
}
