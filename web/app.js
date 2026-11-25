(function(){
const tg = window.Telegram && Telegram.WebApp;
if (tg) { tg.ready(); tg.expand(); try{tg.setHeaderColor('#000000');tg.setBackgroundColor('#000000');tg.disableVerticalSwipes&&tg.disableVerticalSwipes();}catch(e){} }
const $ = s => document.querySelector(s);
const app = $('#app');
const esc = s => String(s==null?'':s).replace(/[&<>"]/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const TITLES = {film:'Фильмы', series:'Сериалы', book:'Книги'};

let tab = 'film', q = '';

function renderList(){
  const ids = Object.keys(ITEMS).filter(id=>{
    const it = ITEMS[id];
    return it.t===tab && (!q || (it.title+' '+(it.author||'')).toLowerCase().includes(q.toLowerCase()));
  });
  app.innerHTML = `<input class="search top-search" id="q" placeholder="Поиск: ${TITLES[tab].toLowerCase()}" value="${esc(q)}" autocomplete="off">
  <div id="list">${ids.length ? ids.map(id=>`<div class="row"><div class="mid"><b>${esc(ITEMS[id].title)}</b><small>${esc(ITEMS[id].year||'')}</small></div></div>`).join('') : '<div class="empty">Пока пусто</div>'}</div>`;
  const inp = $('#q');
  inp.oninput = ()=>{ q = inp.value; const pos = inp.selectionStart; renderList(); const n = $('#q'); n.focus(); n.setSelectionRange(pos,pos); };
}

function render(){
  document.querySelectorAll('#nav button').forEach(b=>b.classList.toggle('on', b.dataset.tab===tab));
  renderList();
}

document.addEventListener('click', e=>{
  const t = e.target.closest('[data-tab]');
  if (!t) return;
  try{ tg && tg.HapticFeedback.impactOccurred('light'); }catch(_){}
  tab = t.dataset.tab; render(); window.scrollTo(0,0);
});

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
