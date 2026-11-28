import urllib.request,urllib.parse,json,re,time
H={'User-Agent':'OpenApp/1.0 (personal mini app)'}
OUT='C:/zayber/_demo/cast.json'
def req(u):
    for a in range(4):
        try: return json.loads(urllib.request.urlopen(urllib.request.Request(u,headers=H),timeout=40).read())
        except Exception: time.sleep(3*(a+1))
def wd_ru(name):
    """русская фамилия актёра через Wikidata"""
    if re.search(r'[А-Яа-яЁё]',name): return name.split()[-1]
    r=req('https://www.wikidata.org/w/api.php?'+urllib.parse.urlencode({'action':'wbsearchentities','search':name,'language':'ru','uselang':'ru','type':'item','limit':5,'format':'json'}))
    if not r: return None
    for it in r.get('search',[]):
        desc=(it.get('description') or '').lower()
        if any(k in desc for k in ('актёр','актер','актриса','actor','actress','кинорежиссёр')) and it.get('label') and re.search(r'[А-Яа-яЁё]',it['label']):
            lab=re.sub(r'\s*\(.*?\)','',it['label']).strip()
            return lab.split()[-1]
    return None
def tvmaze_cast(title,year):
    base=re.sub(r'\s*\(\d{4}\)$','',title)
    r=req('https://api.tvmaze.com/search/shows?q='+urllib.parse.quote(base))
    if not r: return None
    for x in r:
        s=x['show']
        if (s.get('premiered') or '')[:4]==str(year) or s['name'].lower()==base.lower():
            c=req(f"https://api.tvmaze.com/shows/{s['id']}/cast")
            if not c: continue
            out=[]
            for e in c:
                if e.get('voice') or e.get('self'): continue
                n=e['person']['name']; sn=wd_ru(n)
                if sn and sn not in out: out.append(sn)
                if len(out)==4: break
            if len(out)>=2: return 'tvmaze',out
    return None
def en_cast(alt,year):
    r=req('https://en.wikipedia.org/w/api.php?'+urllib.parse.urlencode({'action':'query','list':'search','srsearch':f'{alt} {year} film','srlimit':2,'format':'json'}))
    if not r: return None
    for hit in r['query']['search']:
        d=req('https://en.wikipedia.org/w/api.php?'+urllib.parse.urlencode({'action':'query','titles':hit['title'],'prop':'revisions','rvprop':'content','rvslots':'main','redirects':1,'format':'json'}))
        try: txt=list(d['query']['pages'].values())[0]['revisions'][0]['slots']['main']['*']
        except Exception: continue
        m=re.search(r'\|\s*starring\s*=\s*(.*?)(?:\n\||\n\}\})',txt,re.S)
        if not m: continue
        names=[(b or a) for a,b in re.findall(r'\[\[([^\]|]+)(?:\|([^\]]+))?\]\]',m.group(1)) if not a.startswith(('File:','Category:'))]
        out=[]
        for n in names[:6]:
            sn=wd_ru(n)
            if sn and sn not in out: out.append(sn)
            if len(out)==4: break
        if len(out)>=2: return hit['title'],out
    return None
head,b=open('C:/zayber/web/catalog.js',encoding='utf-8').read().split('window.CATALOG=',1)
cat=json.loads(b.strip().rstrip(';'))
res=json.load(open(OUT,encoding='utf-8'))
for x in cat:
    t=x['title']
    if x['t']=='book' or res.get(t): continue
    r=None
    if x['t']=='series': r=tvmaze_cast(t,x['year'])
    elif x.get('alt'): r=en_cast(x['alt'].split(' ')[0] if False else x['alt'],x['year'])
    res[t]=r
    json.dump(res,open(OUT,'w',encoding='utf-8'),ensure_ascii=False)
    time.sleep(0.5)
open('C:/zayber/_demo/cast_done3.txt','w').write('DONE')
