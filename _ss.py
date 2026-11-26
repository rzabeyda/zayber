import urllib.request,urllib.parse,json,re,time,os
from PIL import Image
H={'User-Agent':'OpenApp/1.0 (personal mini app)'}
def req(u,b=False):
    for a in range(4):
        try:
            r=urllib.request.urlopen(urllib.request.Request(u,headers=H),timeout=40).read()
            return r if b else json.loads(r)
        except Exception: time.sleep(8*(a+1))
def api(l,p): return req(f'https://{l}.wikipedia.org/w/api.php?'+urllib.parse.urlencode(dict(p,format='json')))
d=api('en',{'action':'query','titles':'Suicide Squad (film)','prop':'revisions','rvprop':'content','rvslots':'main','redirects':1})
pg=list(d['query']['pages'].values())[0]
txt=pg['revisions'][0]['slots']['main']['*']
fn=re.sub(r'^File:','',re.search(r'\|\s*image\s*=\s*([^\n|]+)',txt).group(1).strip())
ii=api('en',{'action':'query','titles':'File:'+fn,'prop':'imageinfo','iiprop':'url'})
open('t.src','wb').write(req(list(ii['query']['pages'].values())[0]['imageinfo'][0]['url'].split('?')[0],True))
im=Image.open('t.src').convert('RGB'); im.thumbnail((720,1080)); im.save('web/covers/suicide.jpg',quality=88,optimize=True); os.remove('t.src')
im.resize((200,300)).save('C:/Users/rzabe/AppData/Local/Temp/suicide.jpg'); print(pg['title'],fn)
def sec(i,t,y,plot,pl):
    return ('' if i==0 else '\n\n— Часть %d: %s (%s) —\n'%(i+1,t,y))+plot+'\n\nЧто даёт фильм:\n'+'\n'.join('— '+s for s in pl)
parts=[('Отряд самоубийц',2016,'Правительство США собирает команду из опаснейших злодеев, чтобы противостоять угрозам, с которыми не справятся обычные герои. Среди них Дэдшот, Харли Квинн, Капитан Бумеранг и Эль Диабло. За каждым бойцом присматривает военный Рик Флэг, а в их телах спрятаны бомбы на случай бунта.',['Видно, как неидеальные люди объединяются ради общей цели.','Понимаешь, что у каждого, даже самого опасного, есть своя боль и слабость.','Ощущаешь яркий стиль, музыку и харизму персонажей.','Замечаешь, как власть использует преступников, когда нужны быстрые решения.','Задумываешься о том, что делает человека злодеем или героем.','Получаешь комикс-блокбастер с Уиллом Смитом, Марго Робби и Джаредом Лето.']),
('Отряд самоубийц: Миссия навылет',2021,'Новая команда заключённых отправляется на остров Корто Мальтезе, чтобы уничтожить опасную лабораторию. Задание кажется самоубийственным, а Эмиль Кроу и его бойцы быстро понимают, что враг серьёзнее, чем казалось.',['Видно, как чёрный юмор и жестокость уживаются в одной истории.','Понимаешь, что команда держится не на дисциплине, а на личных связях.','Ощущаешь свободный стиль Джеймса Ганна.','Получаешь более смелое и смешное продолжение.'])]
desc='Частей: 2 — '+'; '.join('%s (%s)'%(t,y) for t,y,_,_ in parts)+'.\n\n'+''.join(sec(i,*p) for i,p in enumerate(parts))
desc=desc.replace('Получаешь комикс-блокбастер с Уиллом Смитом, Марго Робби и Джаредом Лето.','Получаешь комикс-блокбастер с Уиллом Смитом, Марго Робби и Джаредом Лето.\n\nСмотри в хорошем настроении, чтобы получить порцию экшена и юмора.',1)
x={"t":"film","title":"Отряд самоубийц","author":"Дэвид Эйер","year":2016,"tags":["rank"],"mine":1,"cover":"suicide.jpg","g":0,"c":1,"ru":0,"alt":"Suicide Squad","desc":desc}
p='web/catalog.js'
head,bb=open(p,encoding='utf-8').read().split('window.CATALOG=',1)
cat=json.loads(bb.strip().rstrip(';'))
cat=[c for c in cat if c['title']!=x['title']]+[x]
open(p,'w',encoding='utf-8').write(head+'window.CATALOG='+json.dumps(cat,ensure_ascii=False)+';')
h=open('web/index.html',encoding='utf-8').read()
open('web/index.html','w',encoding='utf-8').write(h.replace('?v=228','?v=229'))
