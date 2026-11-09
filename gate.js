'use strict';
const form = document.getElementById('unlock-form');
const input = document.getElementById('password');
const submit = form.querySelector('.submit');
const status = document.getElementById('status');
const reveal = form.querySelector('.reveal');
const controls = [...document.querySelectorAll('[data-gate-lang]')];
const copy = {
  en: {title:'Jasper-K · Private preview',subtitle:'Learning to optimize GPU kernels.',heading:'Private preview',hint:'Enter the password to read the full article.',password:'Password',open:'Read article',foot:'Read-only preview · No account or installation needed',show:'Show',hide:'Hide',showLabel:'Show password',hideLabel:'Hide password',opening:'Opening article…',wrong:'Incorrect password. Please try again.',network:'Unable to open the article. Check your connection and try again.',unsupported:'Please open this HTTPS address in a current version of Safari, Chrome, or Edge.'},
  zh: {title:'Jasper-K · 阅读预览',subtitle:'学习优化 GPU 算子。',heading:'阅读预览',hint:'输入访问密码，即可阅读完整文章。',password:'访问密码',open:'打开文章',foot:'只读预览 · 无需注册或安装软件',show:'显示',hide:'隐藏',showLabel:'显示密码',hideLabel:'隐藏密码',opening:'正在打开文章…',wrong:'密码不正确，请重新输入。',network:'暂时无法打开，请检查网络后重试。',unsupported:'请使用最新版 Safari、Chrome 或 Edge 打开此 HTTPS 网址。'}
};
let language, statusKey = '', pending = false;
const readLanguage = () => /^zh(?:-cn)?$/i.test(new URL(location.href).searchParams.get('lang') || '') ? 'zh' : 'en';
function renderLanguage(lang, updateURL) {
  language = lang === 'zh' ? 'zh' : 'en';
  const text = copy[language];
  document.documentElement.lang = language === 'zh' ? 'zh-CN' : 'en';
  document.title = text.title;
  for (const el of document.querySelectorAll('[data-gate-copy]')) el.textContent = text[el.dataset.gateCopy];
  const visible = input.type === 'text';
  reveal.textContent = visible ? text.hide : text.show;
  reveal.setAttribute('aria-label', visible ? text.hideLabel : text.showLabel);
  reveal.setAttribute('aria-pressed', String(visible));
  status.textContent = statusKey ? text[statusKey] : '';
  for (const button of controls) button.setAttribute('aria-pressed', String(button.dataset.gateLang === language));
  document.querySelector('.language-switch').setAttribute('aria-label', language === 'zh' ? '选择语言' : 'Choose language');
  if (updateURL) {
    const url = new URL(location.href);
    if (language === 'zh') url.searchParams.set('lang','zh'); else url.searchParams.delete('lang');
    history.replaceState(null, '', url.pathname + url.search + url.hash);
  }
}
const setStatus = key => {statusKey = key; status.textContent = key ? copy[language][key] : '';};
for (const button of controls) button.addEventListener('click', () => renderLanguage(button.dataset.gateLang, true));
window.addEventListener('popstate', () => renderLanguage(readLanguage(), false));
reveal.addEventListener('click', () => {input.type = input.type === 'password' ? 'text' : 'password';renderLanguage(language,false);});
const bytes = base64 => Uint8Array.from(atob(base64), c => c.charCodeAt(0));
form.addEventListener('submit', async event => {
  event.preventDefault(); if (pending) return;
  if (!window.crypto || !window.crypto.subtle) {setStatus('unsupported');return;}
  pending = true; submit.disabled = true; setStatus('opening');
  try {
    const response = await fetch('./article.enc.json', {cache:'no-store'});
    if (!response.ok) throw new Error('network');
    const payload = await response.json();
    const material = await crypto.subtle.importKey('raw', new TextEncoder().encode(input.value), 'PBKDF2', false, ['deriveKey']);
    const key = await crypto.subtle.deriveKey({name:'PBKDF2',hash:'SHA-256',salt:bytes(payload.salt),iterations:payload.iterations}, material, {name:'AES-GCM',length:256}, false, ['decrypt']);
    let plaintext;
    try {plaintext = await crypto.subtle.decrypt({name:'AES-GCM',iv:bytes(payload.iv),additionalData:new TextEncoder().encode('jasper-readonly-v1'),tagLength:128}, key, bytes(payload.ciphertext));}
    catch {setStatus('wrong');input.setAttribute('aria-invalid','true');input.focus();input.select();return;}
    input.value = '';
    const html = new TextDecoder('utf-8', {fatal:true}).decode(plaintext);
    document.open(); document.write(html); document.close(); window.scrollTo(0,0);
  } catch {setStatus('network');}
  finally {pending = false; submit.disabled = false;}
});
input.addEventListener('input', () => {input.removeAttribute('aria-invalid');setStatus('');});
renderLanguage(readLanguage(), false);
