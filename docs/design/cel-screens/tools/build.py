# 把出好的图切成一个个素材,定好在屏幕上的大小,存进仓库,并写一份清单给页面用。
import json, os, sys
import numpy as np
from PIL import Image
from slice import sprites as _slice, cutout, split3
# 抠背景很慢(一张要十几秒),切好的存一份,调大小的时候不用重切
def sprites(path):
    cache='cut/'+os.path.basename(path)[:-4]
    if os.path.exists(cache+'-0.png'): return [Image.open(f'{cache}-{i}.png') for i in range(3)]
    sp=_slice(path)
    if sp:
        os.makedirs('cut',exist_ok=True)
        for i,x in enumerate(sp): x.save(f'{cache}-{i}.png')
    return sp
from sheets import CROPS
OUT=sys.argv[1]; os.makedirs(OUT,exist_ok=True)
# 成熟时在屏幕上有多高(pt)。地块是 68×70pt,高的作物可以探出地块上沿。取自彩纸那一版各作物的大小。
H4={'turnip':58,'potato':58,'strawberry':52,'tomato':72,'corn':80,'melon':46,'eggplant':66,'pumpkin':52,'grape':66,'cabbage':56,'leek':62,'snowpea':72}
STAGE=[2,3,4]; PX=3   # 存成 3 倍屏的大小
# 模型在"一行三株"里改枯萎,有时会留一株不动。这两株是另外补的:
#   白菜成熟的那株:取自上一次出图(那一张的幼苗没变,成熟的是对的)
#   草莓成熟的那株:把健康的那张只留这一株,单独改出来的
def _solo(path):
    im,mask,bg=cutout(Image.open(path)); ys=np.where(mask.sum(1)>2)[0]; xs=np.where(mask.sum(0)>2)[0]
    return im.crop((xs.min()-3,max(ys.min()-3,0),xs.max()+4,min(ys.max()+4,mask.shape[0])))
def _left(path, x1):
    im=Image.open(path); w,h=im.size
    a=np.asarray(im.convert('RGB')).copy(); _,_,bg=cutout(im); a[:, x1:]=bg.round().astype(np.uint8)
    tmp='cut/_left.png'; os.makedirs('cut',exist_ok=True); Image.fromarray(a).save(tmp); return _solo(tmp)
OVERRIDE={('wilted','strawberry',2):lambda: _solo('solo-strawberry.png')}
# 白菜枯萎的这一张,成株和成熟两株底下的土连在一起,切不开;而且成熟的那株没有变。
# 所以幼苗取这一张最左边的一株,成株和成熟取上一次出图(那一张这两株是对的,幼苗没变)。
WHOLE={('wilted','cabbage'):lambda: [_left('wilted-cabbage.png',875)]+list(_slice('rejected2/wilted-cabbage-2.png')[1:])}
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
    for kind in ['healthy','wilted']:
        p=f'{kind}-{cid}.png'
        if not os.path.exists(p): problems.append((cid,kind+' 没有图')); continue
        sp=WHOLE[(kind,cid)]() if (kind,cid) in WHOLE else sprites(p)
        if not sp: problems.append((cid,kind+' 切不开')); continue
        sp=list(sp)
        for i in range(3):
            ov=OVERRIDE.get((kind,cid,i))
            if ov: sp[i]=ov()
        for st,s in zip(STAGE,sp): save(s,f'{cid}-{st}-{kind}',s.size[0]*k,s.size[1]*k)
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
