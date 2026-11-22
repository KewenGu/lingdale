# 把出好的图切成一个个素材,定好在屏幕上的大小,存进仓库,并写一份清单给页面用。
import json, os, sys
import numpy as np
from PIL import Image
from slice import sprites as _slice, cutout, split3
# 抠背景很慢(一张要十几秒),切好的存一份,调大小的时候不用重切
def sprites(path, n=3):
    cache='cut/'+os.path.basename(path)[:-4]
    if os.path.exists(cache+'-0.png'): return [Image.open(f'{cache}-{i}.png') for i in range(n)]
    sp=_slice(path, n)
    if sp:
        os.makedirs('cut',exist_ok=True)
        for i,x in enumerate(sp): x.save(f'{cache}-{i}.png')
    return sp
from sheets import CROPS
OUT=sys.argv[1]; os.makedirs(OUT,exist_ok=True)
# 成熟时在屏幕上有多高(pt)。地块是 68×70pt,高的作物可以探出地块上沿。取自彩纸那一版各作物的大小。
H4={'turnip':58,'potato':58,'strawberry':52,'tomato':72,'corn':80,'melon':46,'eggplant':66,'pumpkin':52,'grape':66,'cabbage':56,'leek':62,'snowpea':72}
STAGE=[2,3,4]; PX=3   # 存成 3 倍屏的大小
# 枯萎只有幼苗和成株两个阶段:成熟的不画枯萎(负责人定的)。
# 南瓜、白菜、韭葱是后来重画的,它们枯萎的那张图里本来就只有两株;别的作物的图里有三株,只取前两株。
TWO={'pumpkin','cabbage','leek'}
atlas={}; problems=[]
def save(im,name,w_pt,h_pt):
    im=im.resize((max(1,round(w_pt*PX)),max(1,round(h_pt*PX))),Image.LANCZOS); im.save(f'{OUT}/{name}.webp','WEBP',quality=88,method=6)
    atlas[name]={'w':round(w_pt,1),'h':round(h_pt,1)}
for cid in CROPS:
    hs=sprites(f'healthy-{cid}.png')
    if not hs: problems.append((cid,'healthy 切不开')); continue
    k=H4[cid]/hs[2].size[1]
    # 太宽放不进地块的,按宽度再收一点
    k=min(k, 70/max(s.size[0] for s in hs))
    # 只有两种样子:健康、枯萎。"不生长"不单独画,用健康的那张(负责人定的)。
    for st,s in zip(STAGE,hs): save(s,f'{cid}-{st}-healthy',s.size[0]*k,s.size[1]*k)
    p=f'wilted-{cid}.png'
    if not os.path.exists(p): problems.append((cid,'wilted 没有图')); continue
    sp=sprites(p, 2 if cid in TWO else 3)
    if not sp: problems.append((cid,'wilted 切不开')); continue
    for st,s in zip(STAGE[:2],sp[:2]): save(s,f'{cid}-{st}-wilted',s.size[0]*k,s.size[1]*k)
# 共用的:种子(只有一种)、发芽(三种健康状态)
hs=sprites('healthy-shared.png')
if hs:
    k=30/hs[1].size[1]
    save(hs[0],'seed',hs[0].size[0]*k,hs[0].size[1]*k)
    for kind in ['healthy','wilted']:
        sp=sprites(f'{kind}-shared.png') if os.path.exists(f'{kind}-shared.png') else None
        if sp: save(sp[1],f'sprout-{kind}',sp[1].size[0]*k,sp[1].size[1]*k)
        else: problems.append(('shared',kind))
# 死了的作物:一小堆干枯的茎叶,所有作物共用一张。出了三个,用中间那个
if os.path.exists('dead.png'):
    sp=sprites('dead.png')
    if sp: s=sp[1]; save(s,'dead',50,50*s.size[1]/s.size[0])
    else: problems.append(('dead','切不开'))
# 地块:三块,存成一样大
if os.path.exists('tiles.png'):
    sp=sprites('tiles.png')
    if sp:
        for name,s in zip(['dry','wet','empty'],sp):
            w=72; save(s,'tile-'+name,w,w*s.size[1]/s.size[0])
    else: problems.append(('tiles','切不开'))
json.dump(atlas,open(f'{OUT}/atlas.json','w'),ensure_ascii=False,indent=0)
open(f'{OUT}/atlas.js','w').write('// 素材清单:每个素材在屏幕上的宽和高(pt)。由切图的脚本写出来,不要手改。\n(window.LD = window.LD || {}).celSprites = '+json.dumps(atlas,ensure_ascii=False)+';\n')
print(len(atlas),'个素材', sum(os.path.getsize(f'{OUT}/{f}') for f in os.listdir(OUT))//1024,'KB'); print('问题:',problems)
