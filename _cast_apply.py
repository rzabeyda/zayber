import json,re
res=json.load(open('C:/zayber/_demo/cast.json',encoding='utf-8'))
p='web/catalog.js'
head,b=open(p,encoding='utf-8').read().split('window.CATALOG=',1)
cat=json.loads(b.strip().rstrip(';'))
n=0;miss=[]
for x in cat:
    r=res.get(x['title'])
    if not r or x['t']=='book': 
        if x['t']!='book': miss.append(x['title'])
        continue
    names=[n for n in r[1] if n[:1].isupper() and n.lower() not in ('английский','французский','русский','немецкий','испанский')]
    if len(names)<2: miss.append(x['title']); continue
    line='[[w]]В ролях: '+', '.join(names)+'[[/w]]'
    d=x['desc']
    if 'В ролях:' in d: continue
    i=d.find('Слоганы')
    if i<0: continue
    x['desc']=d[:i].rstrip('\n')+'\n\n'+line+'\n\n'+d[i:]
    n+=1
open(p,'w',encoding='utf-8').write(head+'window.CATALOG='+json.dumps(cat,ensure_ascii=False)+';')
h=open('web/index.html',encoding='utf-8').read()
open('web/index.html','w',encoding='utf-8').write(re.sub(r'\?v=\d+','?v='+str(int(__import__('time').time())%100000),h))
print('добавлено',n,'без актёров',len(miss))
json.dump(miss,open('_demo/cast_missing.json','w',encoding='utf-8'),ensure_ascii=False)
