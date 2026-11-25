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
const LABEL = {fight:['Сила','239,83,80'],people:['Люди','66,165,245'],women:['Отношения','244,114,182'],selfesteem:['Уверенность','255,193,7'],money:['Деньги','46,204,113'],lazy:['Дисциплина','255,152,0'],lonely:['Одиночество','171,130,255'],anxiety:['Спокойствие','38,198,218'],hopeless:['Выход','144,164,174'],manifest:['Мышление','186,104,200']};
const pill = (t, cls='') => { const [n,c] = LABEL[t]; return `<span class="lab ${cls}" style="color:rgb(${c});background:rgba(${c},.13);border-color:rgba(${c},.38)">${n}</span>`; };
const byMine = (a,b) => (ITEMS[b].mine?1:0) - (ITEMS[a].mine?1:0);

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
  const main = it.tags.find(t=>topics.includes(t)) || it.tags[0];
  const all = it.tags.map(t=>pill(t)).join('');
  return `<button class="row" data-item="${id}"><div class="head"><div class="ttl"><b>${esc(it.title)}</b><small>${esc(sub)}</small></div>${main?pill(main):''}</div>
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
    html = (mine.length ? `<div class="sec">Подобрано для тебя</div>${mine.map(itemRow).join('')}` : '') +
           (rest.length ? `<div class="sec">${mine.length?'Остальное':'Все'}</div>${rest.map(itemRow).join('')}` : '') ||
           '<div class="empty">Пока пусто</div>';
  }
  app.innerHTML = `<div class="top-gap"></div>${html}`;
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
