(() => {
  const button = document.querySelector('#language');
  const apply = language => {
    document.documentElement.lang = language;
    button.textContent = language === 'en' ? '中文 ↗' : 'EN ↗';
    button.setAttribute('aria-label', language === 'en' ? '切换为中文' : 'Switch to English');
    document.title = language === 'en' ? 'laiguzi — Mathematics & AI' : 'laiguzi — 数学与人工智能';
    document.querySelector('nav').setAttribute('aria-label', language === 'en' ? 'Main navigation' : '主导航');
    document.querySelector('meta[name="description"]').content = language === 'en'
      ? 'laiguzi — Research interests, public code and notes in mathematics, AI, graph learning, network science and computational biology.'
      : 'laiguzi 的个人学术主页：数学、人工智能、图学习、网络科学与计算生物学的研究兴趣、公开代码和笔记。';
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
