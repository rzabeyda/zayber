(function(){
const tg = window.Telegram && Telegram.WebApp;
if (tg) { tg.ready(); tg.expand(); try{tg.setHeaderColor('#000000');tg.setBackgroundColor('#000000');tg.disableVerticalSwipes&&tg.disableVerticalSwipes();}catch(e){} }
const $ = s => document.querySelector(s);
const app = $('#app'), sheet = $('#sheet'), sheetBody = $('#sheetBody');
const esc = s => String(s==null?'':s).replace(/[&<>"]/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const TYPE = {film:'Фильм', series:'Сериал', book:'Книга'};
const DONE_VERB = {film:'Посмотрел', series:'Посмотрел', book:'Прочитал'};

// ---- состояние ----
let S = {saved:[], done:[], steps:{}};
try { S = Object.assign(S, JSON.parse(localStorage.getItem('put_state')||'{}')); } catch(e){}
const save = () => localStorage.setItem('put_state', JSON.stringify(S));
const buzz = (t='light') => { try{ tg && tg.HapticFeedback.impactOccurred(t); }catch(e){} };
function toast(t){ const d=document.createElement('div'); d.className='toast'; d.textContent=t; document.body.appendChild(d); setTimeout(()=>d.remove(),1400); }
const toggle = (arr, id) => { const i=arr.indexOf(id); i<0?arr.push(id):arr.splice(i,1); return i<0; };

let tab = 'home', homeSeg = 'problems', libSeg = 'all', libQ = '', libQuality = '';
let view = null; // {type:'problem'|'quality', id}

function qualityXP(k){ return S.done.filter(id => ITEMS[id] && ITEMS[id].q.includes(k)).length; }

// ---- компоненты ----
function itemRow(id){
  const it = ITEMS[id]; if(!it) return '';
  const done = S.done.includes(id), fav = S.saved.includes(id);
  const sub = [it.author, it.year].filter(Boolean).join(' · ');
  return `<button class="row" data-item="${id}">
    <div class="mid"><div><span class="badge ${it.t}">${TYPE[it.t]}</span>${done?'<span class="tick">✓</span>':''}</div>
    <b>${esc(it.title)}</b><small>${esc(sub)}</small></div>
    <span class="heart ${fav?'on':''}">${ico('heart',fav)}</span></button>`;
}
function qualityTags(it){ return it.q.map(k=>`<span class="tag">${ico(k)}${QUALITIES[k].title}</span>`).join(''); }

// ---- экраны ----
function renderHome(){
  if (view && view.type==='problem') return renderProblem(PROBLEMS.find(p=>p.id===view.id));
  if (view && view.type==='quality') return renderQuality(view.id);
  const seg = `<div class="seg"><button data-hseg="problems" class="${homeSeg==='problems'?'on':''}">Что тревожит</button><button data-hseg="quality" class="${homeSeg==='quality'?'on':''}">Что прокачать</button></div>`;
  let body;
  if (homeSeg==='problems'){
    body = `<p class="hint">Выбери, что сейчас беспокоит — я подскажу шаги, фильмы, сериалы и книги.</p>
    <div class="grid">${PROBLEMS.map(p=>`<button class="pcard" data-problem="${p.id}"><span class="ic">${ico(p.id)}</span><b>${p.title}</b><small>${p.sub}</small></button>`).join('')}</div>`;
  } else {
    body = `<p class="hint">Каждый фильм, сериал и книга прокачивают конкретные качества. Выбери, что хочешь развить.</p>` +
      Object.entries(QUALITIES).map(([k,q])=>{
        const total = Object.values(ITEMS).filter(i=>i.q.includes(k)).length;
        return `<button class="row" data-quality="${k}"><span class="ic">${ico(k)}</span><div class="mid"><b>${q.title}</b><small>${q.desc}</small></div><small>${total}</small></button>`;
      }).join('');
  }
  app.innerHTML = `<div class="top"><h1>Open</h1></div>${seg}${body}`;
}

function renderProblem(p){
  const ss = S.steps[p.id] || [];
  const done = ss.length;
  app.innerHTML = `<button class="back" data-back>← Назад</button>
  <div class="hero"><div class="big">${ico(p.id)}</div><h1 style="font-size:26px;margin-top:6px">${p.title}</h1><p>${p.intro}</p></div>
  <h2>Что делать <span class="hint">${done}/${p.steps.length}</span></h2>
  ${p.steps.map((s,i)=>`<button class="step ${ss.includes(i)?'done':''}" data-step="${p.id}:${i}"><i>${ss.includes(i)?'✓':''}</i><span>${esc(s)}</span></button>`).join('')}
  <h2>Что посмотреть и прочитать</h2>
  ${p.items.map(itemRow).join('')}`;
  setBack(true);
}

function renderQuality(k){
  const q = QUALITIES[k];
  const ids = Object.keys(ITEMS).filter(id=>ITEMS[id].q.includes(k));
  const n = qualityXP(k);
  app.innerHTML = `<button class="back" data-back>← Назад</button>
  <div class="hero"><div class="big">${ico(k)}</div><h1 style="font-size:26px;margin-top:6px">${q.title}</h1><p>${q.desc}. Отмечай «посмотрел / прочитал» — уровень растёт.</p>
  <div class="bar" style="margin-top:14px"><span style="width:${(n%3)/3*100}%"></span></div><p class="hint" style="margin-top:6px">Уровень ${Math.floor(n/3)} · ${n%3}/3 до следующего</p></div>
  <h2>Прокачивают это качество</h2>${ids.map(itemRow).join('')}`;
  setBack(true);
}

function renderLib(){
  const types = [['all','Всё'],['film','Фильмы'],['series','Сериалы'],['book','Книги']];
  let ids = Object.keys(ITEMS).filter(id=>{
    const it=ITEMS[id];
    if (libSeg!=='all' && it.t!==libSeg) return false;
    if (libQuality && !it.q.includes(libQuality)) return false;
    if (libQ && !(it.title+' '+(it.author||'')).toLowerCase().includes(libQ.toLowerCase())) return false;
    return true;
  });
  app.innerHTML = `<div class="top"><h1>Библиотека</h1></div>
  <input class="search" id="q" placeholder="Поиск по названию" value="${esc(libQ)}">
  <div class="seg">${types.map(([k,n])=>`<button data-lseg="${k}" class="${libSeg===k?'on':''}">${n}</button>`).join('')}</div>
  <div class="chips"><button class="chip ${!libQuality?'on':''}" data-lq="">Все качества</button>${Object.entries(QUALITIES).map(([k,q])=>`<button class="chip ${libQuality===k?'on':''}" data-lq="${k}">${ico(k)}${q.title}</button>`).join('')}</div>
  <div id="list">${ids.length? ids.map(itemRow).join('') : '<div class="empty">Ничего не найдено</div>'}</div>`;
  const inp=$('#q'); inp.oninput=()=>{ libQ=inp.value; const pos=inp.selectionStart; renderLib(); const n=$('#q'); n.focus(); n.setSelectionRange(pos,pos); };
}

function renderMe(){
  const u = (tg && tg.initDataUnsafe && tg.initDataUnsafe.user) || {};
  const name = [u.first_name,u.last_name].filter(Boolean).join(' ') || 'Гость';
  const av = u.photo_url ? `style="background-image:url('${esc(u.photo_url)}')"` : '';
  const favs = S.saved.filter(id=>ITEMS[id]);
  app.innerHTML = `<div class="top"><h1>Профиль</h1></div>
  <div class="profile"><div class="avatar" ${av}>${u.photo_url?'':esc(name[0]||'?')}</div><div><b>${esc(name)}</b><div class="hint">Пройдено: ${S.done.filter(id=>ITEMS[id]).length} · Избранное: ${favs.length}</div></div></div>
  <h2>Мои качества</h2>
  ${Object.entries(QUALITIES).map(([k,q])=>{const n=qualityXP(k);return `<button class="q" data-quality="${k}"><span class="ic">${ico(k)}</span><div class="mid"><b>${q.title}</b><small>${q.desc}</small><div class="bar"><span style="width:${(n%3)/3*100}%"></span></div></div><span class="lvl">Ур. ${Math.floor(n/3)}</span></button>`}).join('')}
  <h2>Избранное</h2>
  ${favs.length? favs.map(itemRow).join('') : '<div class="empty">Добавляй фильмы и книги в избранное — они появятся здесь</div>'}
  ${CHANNEL_URL?`<button class="btn gold" data-link="${esc(CHANNEL_URL)}">Мой канал на YouTube</button>`:''}`;
}

function render(){
  document.querySelectorAll('#nav button').forEach(b=>b.classList.toggle('on', b.dataset.tab===tab));
  setBack(tab==='home' && !!view);
  ({home:renderHome, lib:renderLib, me:renderMe})[tab]();
}
function setBack(show){
  if(!tg||!tg.BackButton) return;
  tg.BackButton.offClick(goBack);
  if(show){ tg.BackButton.show(); tg.BackButton.onClick(goBack);} else tg.BackButton.hide();
}
function goBack(){ if(sheet.classList.contains('open')) return closeSheet(); view=null; render(); window.scrollTo(0,0); }

// ---- нижняя шторка с описанием ----
function openItem(id){
  const it = ITEMS[id], done=S.done.includes(id), fav=S.saved.includes(id);
  sheetBody.innerHTML = `<span class="badge ${it.t}">${TYPE[it.t]}</span>
  <h3>${esc(it.title)}</h3><div class="hint">${esc([it.author,it.year].filter(Boolean).join(' · '))}</div>
  <p>${esc(it.desc)}</p>
  <div class="hint">Прокачивает:</div><div class="tags">${qualityTags(it)}</div>
  <button class="btn ${done?'line':'green'}" data-act="done:${id}">${done?'✓ Отмечено — убрать':'✓ '+DONE_VERB[it.t]+' (+ к качествам)'}</button>
  <button class="btn ${fav?'pink':'line'}" data-act="fav:${id}">${fav?'В избранном':'В избранное'}</button>`;
  sheet.classList.add('open');
}
function closeSheet(){ sheet.classList.remove('open'); }

// ---- события ----
document.addEventListener('click', e=>{
  const t = e.target.closest('[data-tab],[data-hseg],[data-lseg],[data-lq],[data-problem],[data-quality],[data-item],[data-step],[data-back],[data-act],[data-link],.sheet-bg');
  if(!t) return;
  const d = t.dataset;
  if (t.classList.contains('sheet-bg')) return closeSheet();
  buzz();
  if (d.tab){ tab=d.tab; view=null; closeSheet(); render(); window.scrollTo(0,0); }
  else if (d.hseg){ homeSeg=d.hseg; render(); }
  else if (d.lseg!==undefined){ libSeg=d.lseg; render(); }
  else if (d.lq!==undefined){ libQuality=d.lq; render(); }
  else if (d.problem){ view={type:'problem',id:d.problem}; render(); window.scrollTo(0,0); }
  else if (d.quality){ tab='home'; view={type:'quality',id:d.quality}; render(); window.scrollTo(0,0); }
  else if (d.item){ openItem(d.item); }
  else if (d.step){ const [pid,i]=d.step.split(':'); const a=S.steps[pid]=S.steps[pid]||[]; toggle(a,+i); save(); render(); }
  else if (d.back!==undefined){ goBack(); }
  else if (d.link){ tg&&tg.openLink ? tg.openLink(d.link) : window.open(d.link,'_blank'); }
  else if (d.act){
    const [a,id]=d.act.split(':');
    if(a==='done'){ const on=toggle(S.done,id); toast(on?'Качества прокачаны':'Отметка снята'); }
    else { const on=toggle(S.saved,id); toast(on?'Добавлено в избранное':'Убрано'); }
    save(); openItem(id); render();
  }
});

// старт: если бот открыл на конкретную проблему (?p=fight)
const p = new URLSearchParams(location.search).get('p') || (tg && tg.initDataUnsafe && tg.initDataUnsafe.start_param);
if (p && PROBLEMS.find(x=>x.id===p)) view={type:'problem',id:p};
// ---- знакомство при первом входе ----
function renderOnboarding(){
  document.getElementById('navwrap').style.display='none';
  app.innerHTML = `<div class="top"><h1>Open</h1></div>
  <p class="hint">Давай познакомимся — это займёт 10 секунд.</p>
  <label class="lbl">Имя</label><input class="search" id="ob_name" maxlength="40" placeholder="Как тебя зовут" autocomplete="off">
  <label class="lbl">Возраст</label><input class="search" id="ob_age" type="number" inputmode="numeric" placeholder="Сколько тебе лет">
  <label class="lbl">Город</label><input class="search" id="ob_city" maxlength="60" placeholder="Из какого ты города" autocomplete="off">
  <button class="btn green" id="ob_go">Продолжить</button><div class="hint" id="ob_err" style="text-align:center;margin-top:10px"></div>`;
  $('#ob_go').onclick = async ()=>{
    const name=$('#ob_name').value.trim(), age=parseInt($('#ob_age').value,10), city=$('#ob_city').value.trim();
    if(!name||!city||!(age>=10&&age<=99)){ $('#ob_err').textContent='Заполни все поля (возраст от 10 до 99)'; return; }
    $('#ob_go').disabled=true;
    try{
      const r=await fetch('/api/register',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({initData:tg.initData,name,age,city})});
      if(!r.ok) throw 0;
      document.getElementById('navwrap').style.display=''; render();
    }catch(e){ $('#ob_err').textContent='Не получилось сохранить, попробуй ещё раз'; $('#ob_go').disabled=false; }
  };
}
(async function start(){
  if (tg && tg.initData){
    try{
      const r = await fetch('/api/me',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({initData:tg.initData})});
      const j = await r.json();
      if (r.ok && !j.registered) return renderOnboarding();
    }catch(e){}
  }
  render();
})();
})();
