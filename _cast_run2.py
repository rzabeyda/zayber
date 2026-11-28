import urllib.request,urllib.parse,json,re,time,sys
H={'User-Agent':'OpenApp/1.0 (personal mini app)'}
OUT='C:/zayber/_demo/cast.json'
def req(u):
    for a in range(4):
        try: return json.loads(urllib.request.urlopen(urllib.request.Request(u,headers=H),timeout=40).read())
        except Exception: time.sleep(3*(a+1))
def rw(p): return req('https://ru.wikipedia.org/w/api.php?'+urllib.parse.urlencode(dict(p,format='json')))
def norm(s): return re.sub(r'[^а-яa-z0-9 ]','',s.lower().replace('ё','е')).strip()
def surname(n):
    n=re.sub(r'\s*\(.*?\)','',n).strip()
    parts=n.split()
    s=parts[-1] if parts else n
    if len(parts)>=2 and parts[-1].lower() in ('младший','старший','мл.','ст.'): s=parts[-2]+'-'+parts[-1]
    return s
def cast(title,year,kind):
    base=re.sub(r'\s*\(\d{4}\)$','',title)
    base=re.sub(r'[:!?«»]','',base)
    seen=set()
    for q in (f'{base} {kind} {year}',f'{base} {kind}'):
        r=rw({'action':'query','list':'search','srsearch':q,'srlimit':4})
        if not r or 'query' not in r: continue
        for hit in r['query']['search']:
            t=hit['title']
            if t in seen: continue
            seen.add(t)
            tn=norm(re.sub(r'\s*\((?:фильм|телесериал|сериал|мультфильм)[^)]*\)$','',t))
            if tn!=norm(base): continue
            d=rw({'action':'query','titles':t,'prop':'revisions','rvprop':'content','rvslots':'main','redirects':1})
            if not d or 'query' not in d: continue
            pg=list(d['query']['pages'].values())[0]
            try: txt=pg['revisions'][0]['slots']['main']['*']
            except Exception: continue
            m=re.search(r'\|\s*В главных ролях\s*=\s*(.*?)(?:\n\||\n\}\})',txt,re.S)
            if not m: continue
            names=re.findall(r'\[\[([^\]|]+)(?:\|([^\]]+))?\]\]',m.group(1))
            out=[surname((b or a)) for a,b in names if not a.startswith(('Файл:','Категория:'))]
            if out: return t,out[:4]
    return None
head,b=open('C:/zayber/web/catalog.js',encoding='utf-8').read().split('window.CATALOG=',1)
cat=json.loads(b.strip().rstrip(';'))
try: res=json.load(open(OUT,encoding='utf-8'))
except Exception: res={}
res={k:v for k,v in res.items() if v}
for i,x in enumerate(cat):
    t=x['title']
    if x['t']=='book' or t in res: continue
    kind='телесериал' if x['t']=='series' else 'фильм'
    r=cast(t,x['year'],kind)
    res[t]=r
    json.dump(res,open(OUT,'w',encoding='utf-8'),ensure_ascii=False)
    time.sleep(0.8)
open('C:/zayber/_demo/cast_done2.txt','w').write('DONE')
