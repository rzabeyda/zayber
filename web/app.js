(function(){
const tg = window.Telegram && Telegram.WebApp;
if (tg) { tg.ready(); tg.expand(); try{tg.setHeaderColor('#000000');tg.setBackgroundColor('#000000');tg.disableVerticalSwipes&&tg.disableVerticalSwipes();}catch(e){} }
const $ = s => document.querySelector(s);
const app = $('#app'), navwrap = $('#navwrap');
const esc = s => String(s==null?'':s).replace(/[&<>"]/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const TITLES = {film:'Фильмы', series:'Сериалы', book:'Книги'};
const TOPIC = Object.fromEntries(PROBLEMS.map(p=>[p.id,p]));

let tab = 'film', q = '', topics = [];
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
  const tg_ = it.tags.map(t=>`<span class="tag">${esc(TOPIC[t].title)}</span>`).join('');
  return `<button class="row" data-item="${id}"><b>${esc(it.title)}</b><small>${esc(sub)}</small>
    <div class="desc">${esc(it.desc)}${tg_?`<div class="tags">${tg_}</div>`:''}</div></button>`;
}

// ---------- вкладки каталога ----------
function renderList(){
  const all = Object.keys(ITEMS).filter(id=>ITEMS[id].t===tab);
  const needle = q.trim().toLowerCase();
  let html;
  if (needle){
    const ids = all.filter(id=>(ITEMS[id].title+' '+(ITEMS[id].author||'')).toLowerCase().includes(needle));
    html = ids.length ? ids.map(itemRow).join('') : '<div class="empty">Ничего не найдено</div>';
  } else {
    const score = id => ITEMS[id].tags.filter(t=>topics.includes(t)).length;
    const mine = all.filter(id=>score(id)>0).sort((a,b)=>score(b)-score(a));
    const rest = all.filter(id=>score(id)===0);
    html = (mine.length ? `<div class="sec">Подобрано для тебя</div>${mine.map(itemRow).join('')}` : '') +
           (rest.length ? `<div class="sec">${mine.length?'Остальное':'Все'}</div>${rest.map(itemRow).join('')}` : '') ||
           '<div class="empty">Пока пусто</div>';
  }
  app.innerHTML = `<input class="search top-search" id="q" placeholder="Поиск: ${TITLES[tab].toLowerCase()}" value="${esc(q)}" autocomplete="off"><div id="list">${html}</div>`;
  const inp = $('#q');
  inp.oninput = ()=>{ q = inp.value; const pos = inp.selectionStart; renderList(); const n = $('#q'); n.focus(); n.setSelectionRange(pos,pos); };
}

// ---------- профиль ----------
function renderMe(){
  const u = (tg && tg.initDataUnsafe && tg.initDataUnsafe.user) || {};
  const name = [u.first_name,u.last_name].filter(Boolean).join(' ') || 'Гость';
  const av = u.photo_url ? `style="background-image:url('${esc(u.photo_url)}')"` : '';
  const chip = (p,on) => `<button class="chip ${on?'on':''}" data-topic="${p.id}">${esc(p.title)}</button>`;
  const mine = PROBLEMS.filter(p=>topics.includes(p.id)), other = PROBLEMS.filter(p=>!topics.includes(p.id));
  app.innerHTML = `<div class="profile"><div class="avatar" ${av}>${u.photo_url?'':esc(name[0]||'?')}</div><div><b>${esc(name)}</b>${u.username?`<div class="hint">@${esc(u.username)}</div>`:''}</div></div>
  <h2>Что меня беспокоит</h2>
  ${mine.length ? `<div class="chips">${mine.map(p=>chip(p,true)).join('')}</div>` : '<div class="hint">Пока ничего не выбрано</div>'}
  ${other.length ? `<h2>Добавить ещё</h2><div class="chips">${other.map(p=>chip(p,false)).join('')}</div>` : ''}
  ${mine.length ? `<h2>Что делать</h2>` + mine.map(p=>`<div class="sec">${esc(p.title)}</div>${p.steps.map((s,i)=>`<div class="step"><i>${i+1}</i><span>${esc(s)}</span></div>`).join('')}`).join('') : ''}`;
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
  <label class="lbl">Город</label><input class="search" id="ob_city" maxlength="60" placeholder="Из какого ты города" autocomplete="off">
  <button class="btn" id="ob_go">Продолжить</button><div class="hint" id="ob_err" style="text-align:center;margin-top:10px"></div>`;
  $('#ob_go').onclick = async ()=>{
    const name=$('#ob_name').value.trim(), age=parseInt($('#ob_age').value,10), city=$('#ob_city').value.trim();
    if(!name||!city||!(age>=10&&age<=99)){ $('#ob_err').textContent='Заполни все поля (возраст от 10 до 99)'; return; }
    $('#ob_go').disabled=true;
    try{
      const r = await api('register',{name,age,city});
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
  const t = e.target.closest('[data-tab],[data-item],[data-topic]');
  if (!t) return;
  buzz();
  if (t.dataset.tab){ tab=t.dataset.tab; render(); window.scrollTo(0,0); }
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
        localStorage.setItem('open_topics', JSON.stringify(topics));
        if (!j.registered) return renderOnboarding();
        if (!topics.length) return renderPicker();
      }
    }catch(e){}
  }
  render();
})();
})();
