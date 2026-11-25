(function(){
const tg = window.Telegram && Telegram.WebApp;
if (tg) { tg.ready(); tg.expand(); try{tg.setHeaderColor('#000000');tg.setBackgroundColor('#000000');tg.disableVerticalSwipes&&tg.disableVerticalSwipes();}catch(e){} }
const $ = s => document.querySelector(s);
const app = $('#app'), navwrap = $('#navwrap'), sheet = $('#sheet');
const esc = s => String(s==null?'':s).replace(/[&<>"]/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const buzz = () => { try{ tg && tg.HapticFeedback.impactOccurred('light'); }catch(_){} };

// ---------- данные ----------
const CATS = Object.fromEntries(PROBLEMS.map(p=>[p.id,p]));
const catOf = t => CATS[String(t).split('.')[0]];
const ITEMS = {};
(window.CATALOG||[]).forEach((x,i)=>{ ITEMS['i'+i] = {t:x.t, title:x.title, author:x.author, year:x.year, desc:x.desc, tags:(x.tags||[]).filter(catOf), mine:x.mine, k:x.k, cover:x.cover}; });
const dkey = id => ITEMS[id].t + ':' + ITEMS[id].title;
const SHOW_LABELS = false; // метки Ранг/Страх/Женщины временно выключены
const pill = key => { if (!SHOW_LABELS) return ''; const c = catOf(key); return `<span class="lab" style="color:rgb(${c.color});background:rgba(${c.color},.13);border-color:rgba(${c.color},.38)">${esc(c.title)}</span>`; };
const HEART = '<svg viewBox="0 0 24 24"><path d="M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.5-7 10-7 10z"/></svg>';
const CHECK = '<svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';

// ---------- состояние ----------
let tab = 'film', cat = '', profile = {}, editing = false, done = [], fav = [], sheetId = null;
const load = (k, d) => { try { return JSON.parse(localStorage.getItem(k)||d); } catch(e){ return JSON.parse(d); } };
profile = load('open_profile', '{}'); done = load('open_done', '[]'); fav = load('open_fav', '[]');
function api(path, body){
  return fetch('/api/'+path, {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(Object.assign({initData: tg && tg.initData || ''}, body||{}))});
}
function saveDone(){ localStorage.setItem('open_done', JSON.stringify(done)); if (tg && tg.initData) api('done', {done}).catch(()=>{}); }
function saveFav(){ localStorage.setItem('open_fav', JSON.stringify(fav)); if (tg && tg.initData) api('fav', {fav}).catch(()=>{}); }

// ---------- карточка-квадрат ----------
function fitTitles(root){
  (root||document).querySelectorAll('.card .ct').forEach(b=>{
    let size = 16;
    b.style.fontSize = size+'px';
    while (b.scrollHeight > b.clientHeight + 1 && size > 9) { size -= 0.5; b.style.fontSize = size+'px'; }
  });
}
window.addEventListener('resize', ()=>fitTitles());
if (document.fonts && document.fonts.ready) document.fonts.ready.then(()=>fitTitles());

function coverHtml(it, big){
  if (it.cover) return `<img class="cv" src="covers/${esc(it.cover)}" alt="" loading="lazy">`;
  const c = (catOf(it.tags[0]) || {color:'120,120,120'}).color;
  return `<div class="cv ph" style="--c:${c}"><span>${esc(it.title.slice(0,1))}</span></div>`;
}
const subOf = it => {
  const yr = it.year ? (it.year < 0 ? (-it.year)+' до н. э.' : it.year) : '';
  return [it.author, yr].filter(Boolean).join(' · ');
};
function itemRow(id){
  const it = ITEMS[id];
  const isDone = done.includes(dkey(id)), isFav = fav.includes(dkey(id));
  const main = it.tags[0];
  return `<div class="card ${isDone?'seen':''}" data-item="${id}">${coverHtml(it)}<div class="shade"></div>
    <span class="chk ${isDone?'on':''}" data-done="${id}">${CHECK}</span><span class="heart ${isFav?'on':''}" data-fav="${id}">${HEART}</span>
    <div class="meta">${main?pill(main):''}<b class="ct">${esc(it.title)}</b><small>${esc(subOf(it))||'&nbsp;'}</small></div></div>`;
}

// ---------- вкладки каталога ----------
function renderList(){
  const bar = !SHOW_LABELS ? '' : `<div class="cats">${PROBLEMS.map(p=>`<button class="cat ${cat===p.id?'on':''}" data-cat="${p.id}">${esc(p.title)}</button>`).join('')}</div>`;
  const ids = Object.keys(ITEMS).filter(id=>ITEMS[id].t===tab && (!cat || ITEMS[id].tags.some(t=>t.split('.')[0]===cat)));
  app.innerHTML = `<div class="top-gap"></div>${bar}${ids.length ? `<div class="grid">${ids.map(itemRow).join('')}</div>` : '<div class="empty">Пока пусто</div>'}`;
  fitTitles(app);
}

// ---------- страница фильма/книги ----------
function openSheet(id){
  sheetId = id;
  const it = ITEMS[id];
  const isDone = done.includes(dkey(id)), isFav = fav.includes(dkey(id));
  sheet.innerHTML = `<div class="sh-cover">${coverHtml(it, true)}<div class="sh-fade"></div><button class="sh-x" data-close="1">${'<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg>'}</button></div>
  <div class="sh-body">
    <h1 class="sh-t">${esc(it.title)}</h1>
    <div class="hint">${esc(subOf(it))}</div>
    <div class="tags" style="margin-top:12px">${it.tags.map(pill).join('')}</div>
    <div class="sh-actions"><button class="sact ${isDone?'on':''}" data-done="${id}">${CHECK}<span>${isDone?'Просмотрено':'Отметить'}</span></button><button class="sact ${isFav?'on fav':''}" data-fav="${id}">${HEART}<span>${isFav?'В избранном':'В избранное'}</span></button></div>
    <p class="sh-d">${esc(it.desc).split('\n').join('<br>')}</p>
    ${it.k?`<span class="readbtn" data-read="${it.k}">Читать</span><div class="txt" id="txt-${it.k}" data-noop></div>`:''}
  </div>`;
  sheet.classList.add('open'); sheet.scrollTop = 0; document.body.classList.add('lock');
  if (tg && tg.BackButton){ tg.BackButton.onClick(closeSheet); tg.BackButton.show(); }
}
function closeSheet(){
  sheet.classList.remove('open'); sheet.innerHTML=''; sheetId = null; document.body.classList.remove('lock');
  if (tg && tg.BackButton){ tg.BackButton.offClick(closeSheet); tg.BackButton.hide(); }
}

// ---------- профиль ----------
function renderMe(){
  const u = (tg && tg.initDataUnsafe && tg.initDataUnsafe.user) || {};
  const name = profile.name || [u.first_name,u.last_name].filter(Boolean).join(' ') || 'Гость';
  const av = u.photo_url ? `style="background-image:url('${esc(u.photo_url)}')"` : '';
  const meta = [profile.age ? profile.age+' лет' : '', profile.country||''].filter(Boolean).join(' · ');
  const head = editing
    ? `<div class="profile edit"><div style="width:100%"><label class="lbl" style="margin-top:0">Имя</label><input class="search" id="pe_name" maxlength="40" value="${esc(name)}">
       <label class="lbl">Возраст</label><input class="search" id="pe_age" type="number" inputmode="numeric" value="${esc(profile.age||'')}">
       <label class="lbl">Страна</label><input class="search" id="pe_country" maxlength="60" value="${esc(profile.country||'')}">
       <button class="btn" id="pe_save">Сохранить</button><button class="btn ghost" id="pe_cancel">Отмена</button><div class="hint" id="pe_err" style="text-align:center;margin-top:8px"></div></div></div>`
    : `<button class="profile" data-edit="1"><div class="avatar" ${av}>${u.photo_url?'':esc(name[0]||'?')}</div><div style="text-align:left"><b>${esc(name)}</b><div class="hint">${esc(meta || (u.username?'@'+u.username:''))}</div></div></button>`;
  const keyToId = Object.fromEntries(Object.keys(ITEMS).map(id=>[dkey(id),id]));
  const favItems = fav.map(k=>keyToId[k]).filter(Boolean);
  app.innerHTML = `${head}
  <h2>Избранное</h2>
  ${favItems.length ? `<div class="grid">${favItems.map(itemRow).join('')}</div>` : '<div class="hint">Пока ничего нет</div>'}`;
  fitTitles(app);
}

function bindEdit(){
  const s = $('#pe_save'); if (!s) return;
  $('#pe_cancel').onclick = ()=>{ editing=false; renderMe(); };
  s.onclick = async ()=>{
    const name=$('#pe_name').value.trim(), age=parseInt($('#pe_age').value,10), country=$('#pe_country').value.trim();
    if(!name||!country||!(age>=10&&age<=99)){ $('#pe_err').textContent='Заполни все поля (возраст от 10 до 99)'; return; }
    s.disabled=true;
    try{
      if (tg && tg.initData){ const r=await api('register',{name,age,country}); if(!r.ok) throw 0; }
      profile={name,age,country}; localStorage.setItem('open_profile', JSON.stringify(profile));
      editing=false; renderMe();
    }catch(e){ $('#pe_err').textContent='Не получилось сохранить'; s.disabled=false; }
  };
}

// ---------- знакомство при первом входе ----------
function renderOnboarding(){
  navwrap.style.display='none';
  app.innerHTML = `<div class="top"><h1>Open</h1></div>
  <p class="hint">Давай познакомимся — это займёт 10 секунд.</p>
  <label class="lbl">Имя</label><input class="search" id="ob_name" maxlength="40" placeholder="Как тебя зовут" autocomplete="off">
  <label class="lbl">Возраст</label><input class="search" id="ob_age" type="number" inputmode="numeric" placeholder="Сколько тебе лет">
  <label class="lbl">Страна</label><input class="search" id="ob_country" maxlength="60" placeholder="Из какой ты страны" autocomplete="off">
  <button class="btn" id="ob_go">Продолжить</button><div class="hint" id="ob_err" style="text-align:center;margin-top:10px"></div>`;
  $('#ob_go').onclick = async ()=>{
    const name=$('#ob_name').value.trim(), age=parseInt($('#ob_age').value,10), country=$('#ob_country').value.trim();
    if(!name||!country||!(age>=10&&age<=99)){ $('#ob_err').textContent='Заполни все поля (возраст от 10 до 99)'; return; }
    $('#ob_go').disabled=true;
    try{
      const r = await api('register',{name,age,country});
      if(!r.ok) throw 0;
      profile={name,age,country}; localStorage.setItem('open_profile', JSON.stringify(profile));
      render();
    }catch(e){ $('#ob_err').textContent='Не получилось сохранить, попробуй ещё раз'; $('#ob_go').disabled=false; }
  };
}

// ---------- общее ----------
function render(){
  navwrap.style.display='';
  document.querySelectorAll('#nav button').forEach(b=>b.classList.toggle('on', b.dataset.tab===tab));
  (tab==='me' ? renderMe : renderList)();
}
const refresh = () => { (tab==='me' ? renderMe : renderList)(); if (sheetId) { const y = sheet.scrollTop; openSheet(sheetId); sheet.scrollTop = y; } };

document.addEventListener('click', e=>{
  const t = e.target.closest('[data-tab],[data-item],[data-edit],[data-done],[data-fav],[data-cat],[data-read],[data-close],[data-noop]');
  if (!t) return;
  if (t.hasAttribute('data-noop')) return;
  buzz();
  const d = t.dataset;
  if (d.close){ closeSheet(); }
  else if (d.tab){ if (sheetId) closeSheet(); tab=d.tab; editing=false; render(); window.scrollTo(0,0); }
  else if (d.cat){ cat = (cat===d.cat) ? '' : d.cat; renderList(); }
  else if (d.done){
    const k = dkey(d.done), i = done.indexOf(k);
    i < 0 ? done.push(k) : done.splice(i,1);
    saveDone(); refresh();
  }
  else if (d.fav){
    const k = dkey(d.fav), i = fav.indexOf(k);
    i < 0 ? fav.push(k) : fav.splice(i,1);
    saveFav(); refresh();
  }
  else if (d.read){
    const box = document.getElementById('txt-'+d.read);
    if (box.dataset.on === '1') { box.innerHTML=''; box.dataset.on='0'; t.textContent='Читать'; return; }
    t.textContent = 'Скрыть'; box.dataset.on = '1'; box.innerHTML = '<div class="hint">Загрузка…</div>';
    fetch('t/'+d.read+'.json').then(r=>r.json()).then(list=>{
      box.innerHTML = list.map(p=>`<div class="th"><b>${esc(p.t)}</b><p>${esc(p.x)}</p></div>`).join('');
    }).catch(()=>{ box.innerHTML = '<div class="hint">Не получилось загрузить текст</div>'; });
  }
  else if (d.edit){ editing = true; renderMe(); bindEdit(); }
  else if (d.item){ openSheet(d.item); }
});

(async function start(){
  if (tg && tg.initData){
    try{
      const r = await api('me');
      const j = await r.json();
      if (r.ok){
        fav = j.fav || fav; localStorage.setItem('open_fav', JSON.stringify(fav));
        done = j.done || done; localStorage.setItem('open_done', JSON.stringify(done));
        profile = {name:j.name, age:j.age, country:j.country}; localStorage.setItem('open_profile', JSON.stringify(profile));
        if (!j.registered) return renderOnboarding();
      }
    }catch(e){}
  }
  render();
})();
})();
