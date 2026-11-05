(() => {
  const button = document.querySelector('#language');
  const apply = language => {
    document.documentElement.lang = language;
    button.textContent = language === 'en' ? '中文 ↗' : 'EN ↗';
    button.setAttribute('aria-label', language === 'en' ? '切换为中文' : 'Switch to English');
    document.title = language === 'en' ? 'Xin Lai — Mathematics & AI' : '赖欣 — 数学与人工智能';
    document.querySelector('nav').setAttribute('aria-label', language === 'en' ? 'Main navigation' : '主导航');
    document.querySelector('meta[name="description"]').content = language === 'en'
      ? 'Xin Lai — BIMSA postdoctoral researcher. Mathematics, graph geometry, AI, network science and computational biology.'
      : '赖欣的个人学术主页：BIMSA 博士后，关注数学、图几何、人工智能、网络科学与计算生物学。';
  };
  let saved;
  try { saved = localStorage.getItem('site-language'); } catch {}
  apply(saved === 'en' || saved === 'zh-CN' ? saved : 'zh-CN');
  button.addEventListener('click', () => {
    const language = document.documentElement.lang === 'en' ? 'zh-CN' : 'en';
    apply(language);
    try { localStorage.setItem('site-language', language); } catch {}
  });
  document.querySelector('#year').textContent = new Date().getFullYear();
})();
