const locale = new URLSearchParams(location.search).get('lang') === 'en' ? 'en' : 'tr';
document.documentElement.lang = locale;
for (const section of document.querySelectorAll('[data-locale]')) section.hidden = section.dataset.locale !== locale;
for (const link of document.querySelectorAll('.language a')) if (link.lang === locale) link.setAttribute('aria-current', 'page');
