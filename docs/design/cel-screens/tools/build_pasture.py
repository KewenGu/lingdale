# 把牧场的出图切成一个个素材,定好在屏幕上的大小,存进仓库,写一份清单给页面用。
import json, os, sys
import numpy as np
from PIL import Image
from slice import sprites as _slice
OUT=sys.argv[1]; os.makedirs(OUT,exist_ok=True); PX=3
def sprites(path, n):
    cache='cut/'+os.path.basename(path)[:-4]
    if os.path.exists(f'{cache}-0.png'): return [Image.open(f'{cache}-{i}.png') for i in range(n)]
    sp=_slice(path, n)
    if sp:
        os.makedirs('cut',exist_ok=True)
        for i,x in enumerate(sp): x.save(f'{cache}-{i}.png')
    return sp
atlas={}; problems=[]
def save(im,name,k):
    w,h=im.size[0]*k,im.size[1]*k
    im.resize((max(1,round(w*PX)),max(1,round(h*PX))),Image.LANCZOS).save(f'{OUT}/{name}.webp','WEBP',quality=88,method=4)
    atlas[name]={'w':round(w,1),'h':round(h,1)}
# 牲畜:站着的那一个有多高(pt),取自彩纸那一版(大牛 56×48,大羊 44×40,大鸡 30×30,小的是 0.66 倍)。
# 同一张图里别的样子用同一个比例,所以卧着的自然矮一截。
ANIMALS={'cow':(48,['well','hungry','sick','expect']),'calf':(32,['well','hungry','sick']),
         'sheep':(40,['well','hungry','sick','expect']),'lamb':(26,['well','hungry','sick']),
         'hen':(30,['well','hungry','sick','expect']),'chick':(18,['well','hungry','sick'])}
for who,(h,names) in ANIMALS.items():
    if not os.path.exists(who+'.png'): problems.append((who,'没有图')); continue
    sp=sprites(who+'.png',len(names))
    if not sp: problems.append((who,'切不开')); continue
    k=h/sp[0].size[1]
    for n,s in zip(names,sp): save(s,f'{who}-{n}',k)
# 草垛四档、饲料桶三档:同一张图里用同一个比例,托盘和桶一样大
for name,n,wpt in [('hay',4,60),('bin',3,36)]:
    if not os.path.exists(name+'.png'): problems.append((name,'没有图')); continue
    sp=sprites(name+'.png',n)
    if not sp: problems.append((name,'切不开')); continue
    k=wpt/max(s.size[0] for s in sp)
    for i,s in enumerate(sp): save(s,f'{name}-{i}',k)
# 牧草:矮、中、高三种各两个样子,加一个草茬。高的连穗一共约 56pt
for v in ['a','b']:
    p=f'grass-{v}.png'
    if not os.path.exists(p): problems.append((p,'没有图')); continue
    sp=sprites(p,4)
    if not sp: problems.append((p,'切不开')); continue
    k=56/sp[2].size[1]
    for i in range(3): save(sp[i],f'grass-{i+1}{v}',k)
    if v=='a': save(sp[3],'stubble',k)
json.dump(atlas,open(f'{OUT}/atlas.json','w'),ensure_ascii=False,indent=0)
open(f'{OUT}/atlas.js','w').write('// 牧场素材的清单:每个素材在屏幕上的宽和高(pt)。由切图的脚本写出来,不要手改。\n(window.LD = window.LD || {}).celPastureSprites = '+json.dumps(atlas,ensure_ascii=False)+';\n')
print(len(atlas),'个素材', sum(os.path.getsize(f'{OUT}/{f}') for f in os.listdir(OUT) if f.endswith('.webp'))//1024,'KB'); print('问题:',problems)
