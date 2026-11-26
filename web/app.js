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
(window.CATALOG||[]).forEach((x,i)=>{ ITEMS['i'+i] = {t:x.t, title:x.title, author:x.author, year:x.year, desc:x.desc, tags:(x.tags||[]).filter(catOf), mine:x.mine, g:x.g, c:x.c, k:x.k, cover:x.cover, link:x.link}; });
const dkey = id => ITEMS[id].t + ':' + ITEMS[id].title;
const SHOW_LABELS = false; // метки Ранг/Страх/Женщины временно выключены
const pill = key => { if (!SHOW_LABELS) return ''; const c = catOf(key); return `<span class="lab" style="color:rgb(${c.color});background:rgba(${c.color},.13);border-color:rgba(${c.color},.38)">${esc(c.title)}</span>`; };
const HEART = '<svg viewBox="0 0 24 24"><path d="M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.5-7 10-7 10z"/></svg>';
const CHECK = '<svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';

// ---------- состояние ----------
let sortKey = localStorage.getItem('open_sk') || '', sortDir = +(localStorage.getItem('open_sd') || 1);
let gf = localStorage.getItem('open_gf') || 'all';
let bf = localStorage.getItem('open_bf') || 'all';
const SACRED = ['Библия. Новый Завет','Библия. Ветхий Завет','Коран','Тора','Танах','Талмуд','Трипитака','Веды'];
let tab = 'film', cat = '', profile = {}, editing = false, done = [], fav = [], sheetId = null, curList = [];
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
  return `<div class="card ${isDone?'done':''} ${isFav?'fav':''}" data-item="${id}">${coverHtml(it)}<div class="shade"></div>
    <div class="meta">${main?pill(main):''}<b class="ct">${esc(it.title)}</b><small>${esc(subOf(it))||'&nbsp;'}</small></div></div>`;
}

// ---------- вкладки каталога ----------
function ordered(ids){
  if (!sortKey) return ids;
  const cmp = sortKey==='year'
    ? (x,y)=>{ const a_=ITEMS[x].year, b_=ITEMS[y].year; if(!a_&&!b_) return 0; if(!a_) return 1; if(!b_) return -1; return (a_-b_)*sortDir; }
    : (x,y)=>ITEMS[x].title.localeCompare(ITEMS[y].title,'ru')*sortDir;
  return [...ids].sort(cmp);
}
function sortBtns(){
  const arrow = sortDir===1 ? '<svg viewBox="0 0 12 12"><path d="M2.5 7.5L6 4l3.5 3.5"/></svg>' : '<svg viewBox="0 0 12 12"><path d="M2.5 4.5L6 8l3.5-3.5"/></svg>';
  const b = (k,txt)=>`<button class="sq ${sortKey===k?'on':''}" data-sort="${k}">${txt}${sortKey===k?`<i>${arrow}</i>`:''}</button>`;
  return `<div class="sorts">${b('title','АБВ')}${b('year','Год')}</div>`;
}
function renderList(){
  const bar = !SHOW_LABELS ? '' : `<div class="cats">${PROBLEMS.map(p=>`<button class="cat ${cat===p.id?'on':''}" data-cat="${p.id}">${esc(p.title)}</button>`).join('')}</div>`;
  const ids = ordered(Object.keys(ITEMS).filter(id=>ITEMS[id].t===tab && (!cat || ITEMS[id].tags.some(t=>t.split('.')[0]===cat)) && (tab==='book' ? (bf==='all' || (bf==='sacred') === SACRED.includes(ITEMS[id].title)) : (gf==='all' || (gf==='grow' ? !ITEMS[id].c : !!ITEMS[id].c)))));
  curList = ids;
  const gb = (k,txt)=>`<button class="gf ${gf===k?'on':''}" data-gf="${k}" aria-label="${k==='grow'?'Ранг':k==='relax'?'Релакс':'Все'}">${txt}</button>`;
  const bb = (k,txt,l)=>`<button class="gf ${bf===k?'on':''}" data-bf="${k}" aria-label="${l}">${txt}</button>`;
  const bbar = `<div class="gfs">${bb('all','Все','Все')}${bb('sacred','<svg class="tri" viewBox="0 0 66 22"><path d="M11 2v18M5 8h12"/><path d="M38 3a8 8 0 1 0 0 16a6.4 6.4 0 0 1 0-16z"/><path d="M55 3l7 12H48zM55 19L48 7h14z"/></svg>','Священные писания')}${bb('other','<svg viewBox="0 0 24 24"><path d="M5 4h4v16H5zM10 7h4v13h-4zM15.5 5l3.8-.8 2.7 15.6-3.8.8zM3 21h18"/></svg>','Все кроме священных писаний')}</div>`;
  const gbar0 = `<div class="gfs">${gb('all','Все')}${gb('grow','<svg viewBox="0 0 24 24"><path d="M5 11l7-6 7 6M5 17l7-6 7 6M5 23l7-6 7 6" transform="translate(0 -3)"/></svg>')}${gb('relax','<svg viewBox="0 0 24 24"><path d="M12 4c3 3 3.6 6.6 0 11-3.6-4.4-3-8 0-11zM12 15c-1.2-4-5-6.2-9.5-5.2.2 4.4 4.2 7.2 9.5 5.2zM12 15c1.2-4 5-6.2 9.5-5.2-.2 4.4-4.2 7.2-9.5 5.2zM6 19.5h12"/></svg>')}</div>`;
  const gbar = tab==='book' ? bbar : gbar0;
  app.innerHTML = `${gbar}<div class="tophead"><div class="toptitle">${tab!=='book'&&gf==='relax'?'Расслабься':'Повышаем ранг'} <span class="tcnt">${ids.length}</span></div>${sortBtns()}</div>${bar}${ids.length ? `<div class="grid">${ids.map(itemRow).join('')}</div>` : '<div class="empty">Пока пусто</div>'}`;
  fitTitles(app);
}

// ---------- страница фильма/книги ----------
function openSheet(id){
  sheetId = id;
  const it = ITEMS[id];
  const isDone = done.includes(dkey(id)), isFav = fav.includes(dkey(id));
  sheet.innerHTML = `<div class="sh-cover">${coverHtml(it, true)}<div class="sh-fade"></div>${curList.length>1&&curList.indexOf(id)>=0?`<div class="sh-count">${curList.indexOf(id)+1} / ${curList.length}</div>`:''}<button class="sh-x" data-close="1">${'<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg>'}</button></div>
  <div class="sh-body">
    <h1 class="sh-t">${esc(it.title)}</h1>
    <div class="hint">${esc(subOf(it))}</div>
    <div class="tags" style="margin-top:12px">${it.tags.map(pill).join('')}</div>
    <div class="sh-actions"><button class="sact ${isDone?'on':''}" data-done="${id}">${CHECK}<span>${isDone?(it.t==='book'?'Прочитано':'Просмотрено'):'Отметить'}</span></button><button class="sact ${isFav?'on fav':''}" data-fav="${id}">${HEART}<span>${isFav?'В избранном':'В избранное'}</span></button></div>
    ${it.link?`<button class="watch" data-link="${esc(it.link)}">${it.t==='book'?'Читать':'Смотреть'}</button>`:''}
    <p class="sh-d">${esc(it.desc).split('\n').join('<br>')}</p>
    ${it.k?`<span class="readbtn" data-read="${it.k}">Читать</span><div class="txt" id="txt-${it.k}" data-noop></div>`:''}
    <button class="closebtn" data-close="1">Закрыть</button>
  </div>`;
  sheet.classList.add('open'); sheet.scrollTop = 0; document.body.classList.add('lock');
  if (tg && tg.BackButton){ tg.BackButton.onClick(closeSheet); tg.BackButton.show(); }
}
function navSheet(dir){
  if (!sheetId) return;
  const n = curList.length, i = curList.indexOf(sheetId);
  if (i < 0 || n < 2) return;
  const j = (i + dir + n) % n; // по кругу: с последнего на первый и обратно
  openSheet(curList[j]);
  sheet.classList.remove('slide-l', 'slide-r');
  void sheet.offsetWidth;
  sheet.classList.add(dir > 0 ? 'slide-l' : 'slide-r');
}
let tx = 0, ty = 0, tt = 0, swipeOk = false;
sheet.addEventListener('touchstart', e=>{
  swipeOk = e.touches.length === 1 && !e.target.closest('input,textarea');
  if (swipeOk){ tx = e.touches[0].clientX; ty = e.touches[0].clientY; tt = Date.now(); }
}, {passive:true});
sheet.addEventListener('touchend', e=>{
  if (!swipeOk) return;
  const t = e.changedTouches[0], dx = t.clientX - tx, dy = t.clientY - ty;
  if (Math.abs(dx) > 70 && Math.abs(dx) > Math.abs(dy) * 1.6 && Date.now() - tt < 800){ buzz(); navSheet(dx < 0 ? 1 : -1); }
}, {passive:true});
document.addEventListener('keydown', e=>{
  if (!sheetId) return;
  if (e.key === 'ArrowRight') navSheet(1);
  else if (e.key === 'ArrowLeft') navSheet(-1);
  else if (e.key === 'Escape') closeSheet();
});
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
  curList = favItems;
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
  const t = e.target.closest('[data-tab],[data-item],[data-edit],[data-done],[data-fav],[data-cat],[data-sort],[data-gf],[data-bf],[data-read],[data-close],[data-link],[data-noop]');
  if (!t) return;
  if (t.hasAttribute('data-noop')) return;
  buzz();
  const d = t.dataset;
  if (d.close){ closeSheet(); }
  else if (d.link){ tg && tg.openLink ? tg.openLink(d.link) : window.open(d.link,'_blank'); }
  else if (d.tab){ if (sheetId) closeSheet(); tab=d.tab; editing=false; render(); window.scrollTo(0,0); }
  else if (d.sort){
    if (sortKey===d.sort) sortDir = -sortDir; else { sortKey = d.sort; sortDir = 1; }
    localStorage.setItem('open_sk', sortKey); localStorage.setItem('open_sd', sortDir);
    renderList();
  }
  else if (d.bf){ bf = d.bf; localStorage.setItem('open_bf', bf); renderList(); }
  else if (d.gf){ gf = d.gf; localStorage.setItem('open_gf', gf); renderList(); }
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

(function(){
  const b = document.getElementById('totop');
  if (!b) return;
  const upd = () => b.classList.toggle('show', window.scrollY > 400);
  window.addEventListener('scroll', upd, {passive:true});
  b.addEventListener('click', () => { window.scrollTo(0,0); try{ Telegram.WebApp.HapticFeedback.impactOccurred('light'); }catch(e){} });
  upd();
})();
