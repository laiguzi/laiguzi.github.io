export const currencies = ['EUR', 'CNY', 'USD'];
export function monthKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}
export function todayKey(date = new Date()) {
  return `${monthKey(date)}-${String(date.getDate()).padStart(2, '0')}`;
}
export function summarize(entries, month, currency) {
  const cents = type => entries.filter(x => x.type === type && x.currency === currency && x.date.startsWith(month + '-'))
    .reduce((total, x) => total + Math.round(Number(x.amount) * 100), 0);
  const income = cents('income'), expense = cents('expense');
  return {income: income / 100, expense: expense / 100, balance: (income - expense) / 100};
}
export function money(value, currency) {
  return new Intl.NumberFormat('zh-CN', {style: 'currency', currency}).format(value);
}
export function weeklyMinutes(sessions, now = new Date()) {
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  start.setDate(start.getDate() - (start.getDay() + 6) % 7);
  const first = todayKey(start), last = todayKey(now);
  return sessions.filter(s => s.date >= first && s.date <= last).reduce((sum, s) => sum + Number(s.minutes), 0);
}
export function csvCell(value) {
  let text = String(value ?? '');
  if (/^[\s]*[=+\-@]/.test(text)) text = "'" + text;
  return '"' + text.replaceAll('"', '""') + '"';
}
export function demoData() {
  const date = todayKey();
  return {
    learning_goals: [
      {id: 'demo-goal-1', title: '读完一篇图学习论文', category: '研究', target_date: date, status: 'active'},
      {id: 'demo-goal-2', title: '练习德语日常表达', category: '语言', target_date: '', status: 'active'}
    ],
    study_sessions: [{id: 'demo-study-1', subject: '数学阅读（示例）', date, minutes: 45, note: '记录一个关键问题'}],
    finance_entries: [
      {id: 'demo-finance-1', date, type: 'income', amount: 1000, currency: 'EUR', category: '示例收入', note: ''},
      {id: 'demo-finance-2', date, type: 'expense', amount: 32.5, currency: 'EUR', category: '餐饮', note: '虚构记录'}
    ],
    monthly_budgets: [{id: 'demo-budget-1', month: monthKey(), amount: 600, currency: 'EUR'}]
  };
}
