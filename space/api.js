import {config} from './config.js?v=5ba93ca23ee6';
const tables = new Set(['learning_goals', 'study_sessions', 'finance_entries', 'monthly_budgets']);
const storageKey = 'laibuhui-space-session';
export function configured(settings = config) {
  return /^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(settings.supabaseUrl) && /^sb_publishable_[A-Za-z0-9_-]+$/.test(settings.publishableKey);
}
export class PrivateAPI {
  constructor(settings = config) { this.settings = settings; this.session = null; this.refreshing = null; }
  clear() { this.session = null; try { sessionStorage.removeItem(storageKey); } catch {} }
  remember(session) {
    if (!session?.access_token || !session?.refresh_token || !session?.user?.id) throw new Error('登录信息不完整，请重新登录。');
    this.session = {...session, expires_at: session.expires_at || Math.floor(Date.now() / 1000) + session.expires_in};
    try { sessionStorage.setItem(storageKey, JSON.stringify(this.session)); } catch {}
  }
  async raw(path, options = {}, token) {
    if (!configured(this.settings)) throw new Error('登录服务尚未连接。');
    const headers = {'apikey': this.settings.publishableKey, 'Content-Type': 'application/json', ...options.headers};
    if (token) headers.Authorization = `Bearer ${token}`;
    let response;
    try { response = await fetch(this.settings.supabaseUrl + path, {...options, headers, signal: AbortSignal.timeout(20000)}); }
    catch { throw new Error('暂时无法连接，请检查网络后重试。'); }
    const body = await response.json().catch(() => null);
    if (!response.ok) {
      if (response.status === 401) throw new Error('登录已过期，请退出后重新登录。');
      if (response.status === 403) throw new Error('当前账号没有访问权限。');
      if (response.status === 429) throw new Error('操作过于频繁，请稍后再试。');
      throw new Error('操作未完成，请检查输入或稍后重试。');
    }
    return body;
  }
  async restore() {
    if (!configured(this.settings)) return false;
    let saved;
    try { saved = JSON.parse(sessionStorage.getItem(storageKey) || 'null'); } catch { this.clear(); return false; }
    if (!saved?.access_token || !saved?.refresh_token) return false;
    this.session = saved;
    try { await this.token(); const user = await this.raw('/auth/v1/user', {}, this.session.access_token); this.session.user = user; return true; }
    catch { this.clear(); return false; }
  }
  async token() {
    if (!this.session) throw new Error('请先登录。');
    if (this.session.expires_at < Date.now() / 1000 + 60) {
      if (!this.refreshing) this.refreshing = this.raw('/auth/v1/token?grant_type=refresh_token', {method: 'POST', body: JSON.stringify({refresh_token: this.session.refresh_token})})
        .then(s => this.remember(s)).catch(error => { this.clear(); throw error; }).finally(() => { this.refreshing = null; });
      await this.refreshing;
    }
    return this.session.access_token;
  }
  async sendLoginLink(email) {
    const redirect = 'https://laibuhui.top/space/';
    return this.raw('/auth/v1/otp?redirect_to=' + encodeURIComponent(redirect), {
      method: 'POST', body: JSON.stringify({email, create_user: false})
    });
  }
  async acceptLoginLink(accessToken, refreshToken, expiresIn) {
    if (!accessToken || !refreshToken) throw new Error('登录链接不完整，请重新发送。');
    // Validate the token with Auth before trusting any identity or retaining a session.
    const user = await this.raw('/auth/v1/user', {}, accessToken);
    const ttl = Math.max(60, Math.min(Number(expiresIn) || 3600, 3600));
    this.remember({access_token: accessToken, refresh_token: refreshToken, user,
      expires_at: Math.floor(Date.now() / 1000) + ttl});
  }
  async owner() { return this.raw('/rest/v1/rpc/space_is_owner', {method: 'POST', body: '{}'}, await this.token()); }
  async load() {
    // Complete all reads before replacing the UI. Never fall back to demo data on failure.
    const result = await Promise.all([...tables].map(async table => {
      const rows = []; let page;
      do {
        page = await this.raw(`/rest/v1/${table}?select=*&order=created_at.desc,id.desc&limit=500&offset=${rows.length}`, {}, await this.token());
        rows.push(...page);
      } while (page.length === 500);
      return [table, rows];
    }));
    return Object.fromEntries(result);
  }
  async write(table, record, id) {
    if (!tables.has(table)) throw new Error('无效的数据类型。');
    const path = '/rest/v1/' + table + (id ? `?id=eq.${encodeURIComponent(id)}` : '');
    return this.raw(path, {method: id ? 'PATCH' : 'POST', headers: {Prefer: 'return=representation'}, body: JSON.stringify({...record, user_id: this.session.user.id})}, await this.token());
  }
  async logout() {
    const token = this.session?.access_token;
    this.clear();
    if (token) await this.raw('/auth/v1/logout?scope=local', {method: 'POST'}, token);
  }
}
