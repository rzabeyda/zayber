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
(window.CATALOG||[]).forEach((x,i)=>{ ITEMS['i'+i] = {t:x.t, title:x.title, author:x.author, year:x.year, desc:x.desc, tags:(x.tags||[]).filter(catOf), mine:x.mine, g:x.g, c:x.c, th:x.th||[], ep:x.ep, dt:x.dt, gr:x.gr, gn:x.gn||'', kpq:x.kpq, ru:x.ru, alt:x.alt, link:x.link, k:x.k, cover:x.cover, link:x.link}; });
const slug = t => { let h = 5381; for (const ch of t) h = ((h*33) ^ ch.charCodeAt(0)) >>> 0; return 'f' + h.toString(36); };
const dkey = id => ITEMS[id].t + ':' + ITEMS[id].title;
const SHOW_LABELS = false; // метки Ранг/Страх/Женщины временно выключены
const pill = key => { if (!SHOW_LABELS) return ''; const c = catOf(key); return `<span class="lab" style="color:rgb(${c.color});background:rgba(${c.color},.13);border-color:rgba(${c.color},.38)">${esc(c.title)}</span>`; };
const HEART = '<svg viewBox="0 0 24 24"><path d="M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.5-7 10-7 10z"/></svg>';
const CHECK = '<svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';

// ---------- состояние ----------
let sortKey = localStorage.getItem('open_sk') || '', sortDir = +(localStorage.getItem('open_sd') || 1);
let gf = localStorage.getItem('open_gf') || 'all'; if (!['all','char','mind','chill'].includes(gf)) { gf = 'all'; localStorage.setItem('open_gf','all'); }
let tgl = localStorage.getItem('open_tg') || 'all'; if (!['all','film','one','ser'].includes(tgl)) tgl = 'all';
let q = '', th = '', geo = localStorage.getItem('open_geo') || '';
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
    <div class="meta">${main?pill(main):''}<b class="ct">${esc(it.dt||it.title)}</b><small>${esc(subOf(it))||'&nbsp;'}</small></div></div>`;
}

// ---------- вкладки каталога ----------
function ordered(ids){
  if (!sortKey) return ids;
  const cmp = sortKey==='year'
    ? (x,y)=>{ const a_=ITEMS[x].year, b_=ITEMS[y].year; if(!a_&&!b_) return 0; if(!a_) return 1; if(!b_) return -1; return (b_-a_)*sortDir; }
    : (x,y)=>ITEMS[x].title.localeCompare(ITEMS[y].title,'ru')*sortDir;
  return [...ids].sort(cmp);
}
function sortBtns(){
  const yrs = Object.values(ITEMS).filter(x=>x.t===tab && x.year).map(x=>x.year);
  const arrow = sortDir===1 ? '<svg viewBox="0 0 12 12"><path d="M2.5 7.5L6 4l3.5 3.5"/></svg>' : '<svg viewBox="0 0 12 12"><path d="M2.5 4.5L6 8l3.5-3.5"/></svg>';
  const b = (k,txt)=>`<button class="sq ${sortKey===k?'on':''}" data-sort="${k}">${txt}${sortKey===k?`<i>${arrow}</i>`:''}</button>`;
  return `<div class="sorts">${b('title','<span class="az">'+(sortKey==='title'&&sortDir===-1?'Я':'А')+'</span>')}${b('year','<span class="az">'+(yrs.length?(sortKey==='year'&&sortDir===-1?Math.min(...yrs):Math.max(...yrs)):'Год')+'</span>')}${tab==='book' ? '' : `<button class="sq geo ${geo?'on':''}" data-geo="1" aria-label="Русские или зарубежные">${geo==='world' ? '<svg viewBox="0 0 512 512"><defs><clipPath id="gbc"><circle cx="256" cy="256" r="240"/></clipPath><clipPath id="gbl"><path d="M22 300 C20 120 140 30 286 28 C300 120 270 230 150 285 C110 305 60 310 22 300Z"/></clipPath></defs><g clip-path="url(#gbc)"><rect width="512" height="512" fill="#0a74f0"/><g clip-path="url(#gbl)"><rect width="512" height="512" fill="#2a8bff"/><path d="M140 55L185 72L185 120L105 168L95 205L65 190L55 235L30 225L45 170L95 100Z" fill="#7ed844"/></g><path d="M300 60L355 48L420 100L470 170L488 240L455 285L440 345L392 392L388 300L375 258L312 255L280 228L272 175L310 135L312 108L298 95Z" fill="#5faa23"/><path d="M72 300L72 265L88 262L145 282L170 320L232 327L225 356L192 400L185 440L195 478L160 465L128 385L96 365L72 335Z" fill="#5faa23"/><path d="M30 225L65 190L95 205L88 262L145 282L150 300L72 300L50 262Z" fill="#7ed844"/></g></svg>' : '<svg viewBox="0 0 512 512"><defs><clipPath id="rfc"><circle cx="256" cy="256" r="250"/></clipPath><linearGradient id="rfg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".0"/><stop offset="1" stop-color="#000" stop-opacity=".28"/></linearGradient></defs><g clip-path="url(#rfc)"><rect width="512" height="170" fill="#fff"/><rect y="160" width="512" height="195" fill="#0a37a0"/><rect y="352" width="512" height="160" fill="#d51b25"/><rect width="512" height="512" fill="url(#rfg)"/><circle cx="192" cy="185" r="148" fill="#fff" fill-opacity=".16"/></g></svg>'}</button>`}</div>`;
}
function listIds(){
  const qq = q.trim().toLowerCase();
  if (qq) return ordered(Object.keys(ITEMS).filter(id=>ITEMS[id].t===tab && (ITEMS[id].title+' '+(ITEMS[id].author||'')+' '+(ITEMS[id].alt||'')+' '+(ITEMS[id].gn||'')).toLowerCase().includes(qq)));
  if (geo) return ordered(Object.keys(ITEMS).filter(id=>ITEMS[id].t===tab && (geo==='ru') === !!ITEMS[id].ru));
  return ordered(Object.keys(ITEMS).filter(id=>ITEMS[id].t===tab && (!cat || ITEMS[id].tags.some(t=>t.split('.')[0]===cat)) && (tab==='book' ? (bf==='all' || (bf==='sacred') === SACRED.includes(ITEMS[id].title)) : tab==='toon' ? (tgl==='all' || ITEMS[id].ep===tgl) : (gf==='all' || ITEMS[id].gr===gf))).filter(id=>!q || (ITEMS[id].title+' '+(ITEMS[id].author||'')).toLowerCase().includes(q.toLowerCase())).filter(id=>!th || (ITEMS[id].th||[]).includes(th)));
}
function renderList(){
  const bar = !SHOW_LABELS ? '' : `<div class="cats">${PROBLEMS.map(p=>`<button class="cat ${cat===p.id?'on':''}" data-cat="${p.id}">${esc(p.title)}</button>`).join('')}</div>`;
  const ids = listIds();
  curList = ids;
  const gb = (k,txt)=>`<button class="gf ${gf===k&&!geo?'on':''}" data-gf="${k}" aria-label="${k==='char'?'Характер':k==='mind'?'Сознание':k==='chill'?'Релакс':'Все'}">${txt}</button>`;
  const bb = (k,txt,l)=>`<button class="gf ${bf===k?'on':''}" data-bf="${k}" aria-label="${l}">${txt}</button>`;
  const bbar = `<div class="gfs">${bb('all','Все','Все')}${bb('sacred','<i class="ei ei-cross"></i>','Священные писания')}${bb('other','<i class="ei ei-book"></i>','Все кроме священных писаний')}</div>`;
  const gbar0 = `<div class="gfs">${gb('all','Все')}${gb('char','<i class="ei ei-bicep"></i>')}${gb('mind','<i class="ei ei-brain"></i>')}${gb('chill','<i class="ei ei-chill"></i>')}</div>`;
  const tb = (k,txt)=>`<button class="gf tx ${tgl===k?'on':''}" data-tg="${k}">${txt}</button>`;
  const tbar = `<div class="gfs">${tb('all','Все')}${tb('film','Фильмы')}${tb('one','Мульты')}${tb('ser','Сериалы')}</div>`;
  const gbar = tab==='book' ? bbar : tab==='toon' ? tbar : gbar0;
  const TH = [['fear','Страх'],['money','Деньги'],['discipline','Дисциплина'],['women','Женщины']];
  const thbar = `<div class="ths">${TH.map(([k,t])=>`<button class="thc ${th===k?'on':''}" data-th="${k}">${t}</button>`).join('')}</div>`;
  app.innerHTML = `<div class="srow"><input class="search" id="q" placeholder="Поиск" value="${esc(q)}" autocomplete="off"><button class="rnd" id="rnd" aria-label="Случайный выбор"><span>РАНДОМ</span></button></div>${gbar}<div class="tophead"><div class="toptitle">${tab==='toon' ? 'Мульты' : tab==='book' ? 'Библиотека' : geo==='ru' ? 'Русское' : geo==='world' ? 'Весь мир' : gf==='chill' ? 'Релакс' : gf==='char' ? 'Характер' : gf==='mind' ? 'Сознание' : 'Всё подряд'} <span class="tcnt" id="tc">${ids.length}</span></div>${sortBtns()}</div>${bar}<div id="gridbox">${gridHtml(ids)}</div>`;
  fitTitles(app);
  const qi = $('#q');
  if (qi) qi.oninput = () => { q = qi.value; const l = listIds(); curList = l; $('#gridbox').innerHTML = gridHtml(l); $('#tc').textContent = l.length; fitTitles($('#gridbox')); };
  const rb = $('#rnd');
  if (rb) rb.onclick = () => { const l = listIds().filter(id=>!done.includes(dkey(id))); if (l.length) openSheet(l[Math.floor(Math.random()*l.length)]); else { rb.querySelector('span').textContent = 'Всё отмечено'; setTimeout(()=>{ rb.querySelector('span').textContent = 'РАНДОМ'; }, 1800); } };
}
function gridHtml(ids){ return ids.length ? `<div class="grid">${ids.map(itemRow).join('')}</div>` : '<div class="empty">Ничего не найдено</div>'; }

// ---------- страница фильма/книги ----------
function openSheet(id){
  sheetId = id;
  const it = ITEMS[id];
  const isDone = done.includes(dkey(id)), isFav = fav.includes(dkey(id));
  sheet.innerHTML = `<div class="sh-cover">${coverHtml(it, true)}<div class="sh-fade"></div>${curList.length>1&&curList.indexOf(id)>=0?`<div class="sh-count">${curList.indexOf(id)+1} / ${curList.length}</div>`:''}<button class="sh-x" data-close="1">${'<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg>'}</button></div>
  <div class="sh-body">
    <h1 class="sh-t">${esc(it.dt||it.title)}</h1>
    <div class="hint">${esc(subOf(it))}</div>
    <div class="tags" style="margin-top:12px">${it.tags.map(pill).join('')}</div>
    <div class="sh-actions"><button class="sact ${isDone?'on':''}" data-done="${id}">${CHECK}<span>${isDone?(it.t==='book'?'Прочитано':'Просмотрено'):'Отметить'}</span></button><button class="sact ${isFav?'on fav':''}" data-fav="${id}">${HEART}<span>${isFav?'В избранном':'В избранное'}</span></button></div>
    <button class="watch share" data-share="${id}">Поделиться</button>
    <p class="sh-d">${esc(it.desc).split('\n').join('<br>').split('[[y]]').join('<span class="hl">').split('[[/y]]').join('</span>').split('[[b]]').join('<span class="hlb">').split('[[/b]]').join('</span>').split('[[r]]').join('<span class="hlr">').split('[[/r]]').join('</span>').split('[[w]]').join('<span class="hlw">').split('[[/w]]').join('</span>')}</p>
    ${it.k?`<span class="readbtn" data-read="${it.k}">Читать</span><div class="txt" id="txt-${it.k}" data-noop></div>`:''}
    ${it.link?`<button class="watch" data-link="${esc(it.link)}">${it.t==='book'?'Читать':'Смотреть'}</button>`:(it.t!=='book'?`<button class="watch" data-link="${esc('https://www.kinopoisk.ru/index.php?kp_query='+encodeURIComponent(it.kpq||(it.title+(it.year?' '+it.year:''))))}">Где смотреть</button>`:'')}
    <button class="closebtn" data-close="1">Назад</button>
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
const AUTHOR_PICKS = [["Лучше звоните Солу", "Можно быть по одну сторону закона, а можно — по другую. Но если с кем-то договариваешься, держи своё слово."], ["Во все тяжкие", "Я всю мою жизнь прожил в страхе. Боялся того, что могло случиться, должно или не должно было случиться… и все пятьдесят лет я так прожил. Часто просыпался в три часа ночи… Но знаешь что, с тех пор как у меня нашли рак, я сплю отлично. И вот тогда я понял, что самое страшное — сам страх, он настоящий враг. Так что вставай и выйди навстречу миру, и врежь этому гаду так, чтоб все зубы повылетали."], ["Эль Камино: Во все тяжкие", "Либо ты убегаешь от вещей, либо встречаешься с ними лицом к лицу."], ["Игра в кальмара", "Если остаёшься человеком даже в самые тяжёлые моменты, вселенная никогда не бросит тебя."], ["Матрица", "Этот мир натянули на твои глаза, чтобы скрыть от тебя правду."], ["Шоу Трумана", "Весь мир вокруг может быть декорацией, где тебе с детства написали сценарий, но пока сам не упрёшься в стену и не выйдешь за дверь — живым не станешь."], ["Гладиатор", "У тебя могут забрать семью, свободу и имя, но если внутри есть стержень — даже в цепях ты остаёшься сильнее императора."], ["Форрест Гамп", "Не надо быть самым умным, чтобы победить. Просто будь честным, не предавай своих и беги вперёд, что бы ни происходило."], ["Лицо со шрамом", "Весь мир у твоих ног, если у тебя нет страха, но когда жадность и эго сносят крышу — ты сам себя закапываешь."], ["Брат", "Сила в холодном спокойствии и в том, что ты своих не бросаешь."], ["Бригада", "Если про меня или про кого-то из вас скажут, что он — фуфло, ну зачем тогда жить? Верно!?"], ["Бумер", "Не жизнь такая, а ты такой."], ["Чёрный двор", "Пацанские понты и романтика улиц красивы только на словах, а в жизни за них платят сломанными судьбами и сроками."], ["Шекер", "Лёгких денег не бывает — как только подумал, что самый хитрый и обманул систему, капкан уже захлопнулся."], ["Спасти рядового Райана", "Когда вокруг мясорубка и смерть, только там понимаешь, чего на самом деле стоит человеческая жизнь и мужское слово."], ["Малышка на миллион", "Хочешь стать лучшим — паши через боль до самого конца, даже если знаешь, что цена за мечту может быть максимальной."], ["Достучаться до небес", "Мы вечно откладываем жизнь на потом, а по-настоящему просыпаемся только тогда, когда времени остаётся на пару дней."], ["1+1 Неприкасаемые", "Даже если жизнь приковала тебя к креслу, рядом всегда может оказаться простой парень без тормозов, который снова научит тебя кайфовать от каждого дня."], ["День сурка", "Ты будешь просыпаться в одном и том же дерьме снова и снова, пока не перестанешь быть эгоистом и не поменяешь себя внутри."], ["Эффект бабочки", "Не пытайся переписать прошлое — каждая твоя ошибка сделала тебя тем, кто ты есть, а любая попытка схитрить ломает судьбы близких."], ["Игрок", "Когда внутри пустота, ты ставишь на кон не деньги, а собственную жизнь — и выигрываешь только тогда, когда перестаёшь бояться всё потерять."], ["Поймай меня, если сможешь", "Ограничения лишь в твоей голове."], ["Мгла", "Никогда не теряй веру, даже если кажется, что выхода нет."], ["Класс", "Никогда никого не бойся, иначе умрёшь."], ["Защищая свою жизнь", "На том свете тебя спросят не за твои косяки, а за то, хватило ли тебе смелости жить, а не прятаться в норе от страха."], ["Треугольник", "Ты будешь ходить по одному и тому же кругу ада, пока не перестанешь врать себе и не примешь то, что уже случилось."], ["Хатико: Самый верный друг", "Собака учит нас тому, о чём люди давно забыли: верность — это не красивые слова, это когда ждёшь до последнего вздоха."], ["Сайлент Хилл", "Внешний мир — это всегда отражение твоего внутреннего мира."], ["Укрощение строптивого", "Когда мужик самодостаточен, честен с собой и не прогибается под чужие капризы — именно это и сводит всех с ума."], ["ЖБ", "Жизнь всегда проверит, чего стоит твоё слово и твоё братство, когда запахнет реальными проблемами."], ["Коммерсант", "В больших делах нет друзей и эмоций — выживает только тот, кто держит голову холодной и просчитывает всё на три шага вперёд."], ["По-мужски", "Быть мужиком — это не кулаками махать в зале, а не струсить и ответить за свою семью в самый дерьмовый момент."], ["50 оттенков серого", "Смотри внимательно. Дисциплина — это путь к богатству."]];
function picksRows(){
  const byTitle = {};
  Object.keys(ITEMS).forEach(id=>{ if (!byTitle[ITEMS[id].title]) byTitle[ITEMS[id].title] = id; });
  return AUTHOR_PICKS.map(([t,q],i)=>{
    const id = byTitle[t]; if (!id) return '';
    return `<div class="pick" data-item="${id}"><div class="pn">${i+1}</div><div class="pb"><b>${esc(t)}</b><span>${esc(q)}</span></div></div>`;
  }).join('');
}
function picksHtml(){
  return `<div class="pickbtn" data-picks="1"><div><b>Подборка от автора</b></div><i>›</i></div>`;
}
function openPicks(){
  let m = document.getElementById('picksm');
  if (!m){ m = document.createElement('div'); m.id = 'picksm'; document.body.appendChild(m); }
  m.innerHTML = `<button class="pm-x" data-pclose="1"><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg></button><button class="pm-up" data-pup="1"><svg viewBox="0 0 24 24"><path d="M12 19V5M5 12l7-7 7 7"/></svg></button><div class="pm-in"><h2>Подборка от автора</h2><div class="hint" style="margin:-4px 0 14px">Смотри по порядку: от самого важного к остальному.</div><div class="picks">${picksRows()}</div><button class="closebtn" data-pclose="1">Назад</button></div>`;
  m.classList.add('open'); m.scrollTop = 0; document.body.classList.add('lock');
}
function closePicks(){ const m = document.getElementById('picksm'); if (m) m.classList.remove('open'); if (!sheetId) document.body.classList.remove('lock'); }
function progHtml(){
  const keys = new Set(Object.keys(ITEMS).map(dkey)); const n = done.filter(k=>keys.has(k)).length, tot = keys.size;
  return `<div class="prog"><div class="prog-t"><b>Просмотрено</b><span>${n} из ${tot}</span></div><div class="prog-b"><i style="width:${tot?Math.round(n/tot*100):0}%"></i></div></div>`;
}
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
  ${picksHtml()}
  ${progHtml()}
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
  const t = e.target.closest('[data-tab],[data-item],[data-edit],[data-done],[data-fav],[data-cat],[data-sort],[data-gf],[data-bf],[data-tg],[data-th],[data-geo],[data-share],[data-read],[data-close],[data-link],[data-noop],[data-picks],[data-pclose],[data-pup]');
  if (!t) return;
  if (t.hasAttribute('data-noop')) return;
  buzz();
  const d = t.dataset;
  if (d.picks){ openPicks(); }
  else if (d.pclose){ closePicks(); }
  else if (d.pup){ document.getElementById('picksm').scrollTo({top:0,behavior:'smooth'}); }
  else if (d.item && t.closest('#picksm')){ closePicks(); openSheet(d.item); }
  else if (d.close){ closeSheet(); }
  else if (d.link){ tg && tg.openLink ? tg.openLink(d.link) : window.open(d.link,'_blank'); }
  else if (d.tab){ if (sheetId) closeSheet(); tab=d.tab; editing=false; render(); window.scrollTo(0,0); }
  else if (d.sort){
    if (sortKey===d.sort) sortDir = -sortDir; else { sortKey = d.sort; sortDir = 1; }
    localStorage.setItem('open_sk', sortKey); localStorage.setItem('open_sd', sortDir);
    renderList();
  }
  else if (d.share){ const it = ITEMS[d.share]; const url = 'https://t.me/zayberman_bot?startapp=' + slug(it.title); const text = it.title + (it.year ? ' ('+it.year+')' : ''); const link = 'https://t.me/share/url?url='+encodeURIComponent(url)+'&text='+encodeURIComponent(text); tg && tg.openTelegramLink ? tg.openTelegramLink(link) : window.open(link,'_blank'); }
  else if (d.geo){ geo = geo==='' ? 'ru' : geo==='ru' ? 'world' : ''; if (geo){ gf = 'all'; localStorage.setItem('open_gf','all'); } localStorage.setItem('open_geo', geo); renderList(); }
  else if (d.th){ th = (th===d.th) ? '' : d.th; renderList(); }
  else if (d.tg){ tgl = d.tg; localStorage.setItem('open_tg', tgl); renderList(); }
  else if (d.bf){ bf = d.bf; localStorage.setItem('open_bf', bf); renderList(); }
  else if (d.gf){ gf = d.gf; geo = ''; localStorage.setItem('open_geo',''); localStorage.setItem('open_gf', gf); renderList(); }
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
  try{
    const sp = tg && tg.initDataUnsafe && tg.initDataUnsafe.start_param;
    if (sp){ const id = Object.keys(ITEMS).find(k=>slug(ITEMS[k].title)===sp); if (id){ tab = ITEMS[id].t; render(); curList = listIds(); openSheet(id); } }
  }catch(e){}
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
