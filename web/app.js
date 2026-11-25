(function(){
const tg = window.Telegram && Telegram.WebApp;
if (tg) { tg.ready(); tg.expand(); try{tg.setHeaderColor('#000000');tg.setBackgroundColor('#000000');tg.disableVerticalSwipes&&tg.disableVerticalSwipes();}catch(e){} }
const $ = s => document.querySelector(s);
const app = $('#app'), navwrap = $('#navwrap');
const esc = s => String(s==null?'':s).replace(/[&<>"]/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const TITLES = {film:'Фильмы', series:'Сериалы', book:'Книги'};
const TOPIC = Object.fromEntries(PROBLEMS.map(p=>[p.id,p]));

// Подмешиваем контент из extra.js (твои фильмы/сериалы/книги); дубли заменяем твоими версиями
(function(){
  const norm = s => s.toLowerCase().replace(/ё/g,'е').replace(/[^a-zа-я0-9]/g,'');
  const have = {}; Object.keys(ITEMS).forEach(id=>{ have[norm(ITEMS[id].title)] = id; });
  delete ITEMS.dark;
  (window.EXTRA||[]).forEach((x,i)=>{
    let tags = x.tags.slice();
    const old = have[norm(x.title)];
    if (old){ tags = [...new Set([...tags, ...ITEMS[old].tags])]; delete ITEMS[old]; }
    ITEMS['x'+i] = {t:x.t, title:x.title, author:x.author, year:x.year, desc:x.desc, tags, mine:1};
  });
})();
const LABEL = {women:['Женщины','255,45,155'],men:['Мужчины','79,195,247'],money:['Деньги','46,204,113'],health:['Здоровье','255,112,67'],anxiety:['Тревога','38,198,218'],relations:['Отношения','171,130,255'],work:['Работа','255,193,7']};
const pill = (t, cls='') => { const [n,c] = LABEL[t]; return `<span class="lab ${cls}" style="color:rgb(${c});background:rgba(${c},.13);border-color:rgba(${c},.38)">${n}</span>`; };
const byMine = (a,b) => (ITEMS[b].mine?1:0) - (ITEMS[a].mine?1:0);

let tab = 'film', q = '', topics = [], profile = {}, editing = false, done = [];
try { done = JSON.parse(localStorage.getItem('open_done')||'[]'); } catch(e){}
let fav = [];
try { fav = JSON.parse(localStorage.getItem('open_fav')||'[]'); } catch(e){}
function saveFav(){ localStorage.setItem('open_fav', JSON.stringify(fav)); if (tg && tg.initData) api('fav', {fav}).catch(()=>{}); }
const dkey = id => ITEMS[id].t + ':' + ITEMS[id].title;
function saveDone(){ localStorage.setItem('open_done', JSON.stringify(done)); if (tg && tg.initData) api('done', {done}).catch(()=>{}); }
try { profile = JSON.parse(localStorage.getItem('open_profile')||'{}'); } catch(e){}
try { topics = JSON.parse(localStorage.getItem('open_topics')||'[]').filter(t=>TOPIC[t]); } catch(e){}

function api(path, body){
  return fetch('/api/'+path, {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(Object.assign({initData: tg && tg.initData || ''}, body||{}))});
}
function setTopics(arr){
  topics = arr;
  localStorage.setItem('open_topics', JSON.stringify(topics));
  if (tg && tg.initData) api('topics', {topics}).catch(()=>{});
}
const buzz = () => { try{ tg && tg.HapticFeedback.impactOccurred('light'); }catch(_){} };

// ---------- карточка ----------
function itemRow(id){
  const it = ITEMS[id];
  const sub = [it.author, it.year].filter(Boolean).join(' · ');
  const main = it.tags.find(t=>topics.includes(t)) || it.tags[0];
  const all = it.tags.map(t=>pill(t)).join('');
  const isDone = done.includes(dkey(id));
  return `<button class="row ${isDone?'seen':''}" data-item="${id}"><div class="head"><span class="chk ${isDone?'on':''}" data-done="${id}"><svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg></span><div class="ttl"><b>${esc(it.title)}</b><small>${esc(sub)||'&nbsp;'}</small></div><div class="side">${main?pill(main):'<span></span>'}<span class="heart ${fav.includes(dkey(id))?'on':''}" data-fav="${id}"><svg viewBox="0 0 24 24"><path d="M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.5-7 10-7 10z"/></svg></span></div></div>
    <div class="desc">${esc(it.desc)}${all?`<div class="tags">${all}</div>`:''}</div></button>`;
}

// ---------- вкладки каталога ----------
function renderList(){
  const all = Object.keys(ITEMS).filter(id=>ITEMS[id].t===tab);
  let html;
  {
    const score = id => ITEMS[id].tags.filter(t=>topics.includes(t)).length;
    const mine = all.filter(id=>score(id)>0).sort((a,b)=>score(b)-score(a) || byMine(a,b));
    const rest = all.filter(id=>score(id)===0).sort(byMine);
    if (topics.length){
      html = mine.length ? `<div class="sec">Подобрано для тебя</div>${mine.map(itemRow).join('')}`
                         : '<div class="empty">Пока нет подборки по твоим темам.<br>Добавь ещё темы в профиле.</div>';
    } else {
      html = rest.length ? rest.map(itemRow).join('') : '<div class="empty">Пока пусто</div>';
    }
  }
  app.innerHTML = `<div class="top-gap"></div>${html}`;
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
  const chip = (p,on) => `<button class="chip ${on?'on':''}" data-topic="${p.id}">${esc(p.title)}</button>`;
  const mine = PROBLEMS.filter(p=>topics.includes(p.id)), other = PROBLEMS.filter(p=>!topics.includes(p.id));
  const keyToId = Object.fromEntries(Object.keys(ITEMS).map(id=>[dkey(id),id]));
  const favItems = fav.map(k=>keyToId[k]).filter(Boolean), doneItems = done.map(k=>keyToId[k]).filter(Boolean);
  app.innerHTML = `${head}
  <h2>Что меня беспокоит</h2>
  ${mine.length ? `<div class="chips">${mine.map(p=>chip(p,true)).join('')}</div>` : '<div class="hint">Пока ничего не выбрано</div>'}
  ${other.length ? `<h2>Добавить ещё</h2><div class="chips">${other.map(p=>chip(p,false)).join('')}</div>` : ''}
  ${favItems.length ? `<h2>Избранное</h2>${favItems.map(itemRow).join('')}` : ''}
  ${doneItems.length ? `<h2>Просмотрено и прочитано <span class="hint">${doneItems.length}</span></h2>${doneItems.map(itemRow).join('')}` : ''}
  ${mine.length ? `<h2>Что делать</h2>` + mine.map(p=>`<div class="sec">${esc(p.title)}</div>${p.steps.map((s,i)=>`<div class="step"><i>${i+1}</i><span>${esc(s)}</span></div>`).join('')}`).join('') : ''}`;
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

// ---------- первый опрос ----------
function renderPicker(){
  navwrap.style.display='none';
  const sel = new Set(topics);
  const draw = ()=>{
    app.innerHTML = `<div class="top"><h1>Что тебя беспокоит?</h1></div>
    <p class="hint">Выбери одно или несколько — я подберу фильмы, сериалы и книги. Потом это можно поменять в профиле.</p>
    <div class="chips" style="margin-top:16px">${PROBLEMS.map(p=>`<button class="chip ${sel.has(p.id)?'on':''}" data-pick="${p.id}">${esc(p.title)}</button>`).join('')}</div>
    <button class="btn" id="pk_go" ${sel.size?'':'disabled'}>Готово</button>`;
    app.querySelectorAll('[data-pick]').forEach(b=>b.onclick=()=>{ buzz(); const id=b.dataset.pick; sel.has(id)?sel.delete(id):sel.add(id); draw(); });
    $('#pk_go').onclick = ()=>{ setTopics([...sel]); navwrap.style.display=''; tab='film'; render(); };
  };
  draw();
}

// ---------- знакомство ----------
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
      topics.length ? (navwrap.style.display='', render()) : renderPicker();
    }catch(e){ $('#ob_err').textContent='Не получилось сохранить, попробуй ещё раз'; $('#ob_go').disabled=false; }
  };
}

// ---------- общее ----------
function render(){
  document.querySelectorAll('#nav button').forEach(b=>b.classList.toggle('on', b.dataset.tab===tab));
  (tab==='me' ? renderMe : renderList)();
}

document.addEventListener('click', e=>{
  const t = e.target.closest('[data-tab],[data-item],[data-topic],[data-edit],[data-done],[data-fav]');
  if (!t) return;
  buzz();
  if (t.dataset.tab){ tab=t.dataset.tab; editing=false; render(); window.scrollTo(0,0); }
  else if (t.dataset.done){
    const id = t.dataset.done, k = dkey(id), i = done.indexOf(k);
    i < 0 ? done.push(k) : done.splice(i,1);
    saveDone();
    t.classList.toggle('on', i < 0);
    t.closest('.row').classList.toggle('seen', i < 0);
  }
  else if (t.dataset.fav){
    const id = t.dataset.fav, k = dkey(id), i = fav.indexOf(k);
    i < 0 ? fav.push(k) : fav.splice(i,1);
    saveFav();
    t.classList.toggle('on', i < 0);
    if (tab==='me') renderMe();
  }
  else if (t.dataset.edit){ editing = true; renderMe(); bindEdit(); }
  else if (t.dataset.item){ t.classList.toggle('open'); }
  else if (t.dataset.topic){
    const id=t.dataset.topic;
    setTopics(topics.includes(id) ? topics.filter(x=>x!==id) : [...topics, id]);
    render();
  }
});

(async function start(){
  if (tg && tg.initData){
    try{
      const r = await api('me');
      const j = await r.json();
      if (r.ok){
        topics = (j.topics||[]).filter(t=>TOPIC[t]);
        fav = j.fav || fav; localStorage.setItem('open_fav', JSON.stringify(fav));
        done = j.done || done; localStorage.setItem('open_done', JSON.stringify(done));
        profile = {name:j.name, age:j.age, country:j.country}; localStorage.setItem('open_profile', JSON.stringify(profile));
        localStorage.setItem('open_topics', JSON.stringify(topics));
        if (!j.registered) return renderOnboarding();
        if (!topics.length) return renderPicker();
      }
    }catch(e){}
  }
  render();
})();
})();
