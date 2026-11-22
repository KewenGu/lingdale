# 把矿洞的出图切成一个个素材,定好在屏幕上的大小,存进仓库,写一份清单给页面用。
import json, os, sys
import numpy as np
from PIL import Image
from slice import cutout, split3
OUT=sys.argv[1]; os.makedirs(OUT,exist_ok=True); PX=3
def boxes(mask, parts, axis):
    out=[]
    for a,b in parts:
        m=mask[:,a:b] if axis==0 else mask[a:b,:]
        ys=np.where(m.sum(1)>2)[0]; xs=np.where(m.sum(0)>2)[0]
        x0,x1,y0,y1=xs.min(),xs.max(),ys.min(),ys.max()
        out.append((a+x0-3,max(y0-3,0),a+x1+4,y1+4) if axis==0 else (max(x0-3,0),a+y0-3,x1+4,a+y1+4))
    return out
def degreen(rgba):
    # 石板和道具是在绿色背景上出的,模型在它们的右边和下边画了一道深绿色的影子。
    # 颜色离背景色远,按颜色抠不掉;这些东西本身没有绿色,所以凡是明显偏绿的像素都去掉。
    a=np.asarray(rgba).astype(np.float64); r,g,b,al=a[...,0],a[...,1],a[...,2],a[...,3]
    green=g-np.maximum(r,b)
    al=al*np.clip(1-(green-4)/12,0,1)
    out=np.dstack([r,g,b,al]).round().astype(np.uint8)
    return Image.fromarray(out,'RGBA'), al>127
def cut(path, n, rows=False, green=False):
    im=Image.open(path); rgba,mask,bg=cutout(im)
    if green: rgba,mask=degreen(rgba)
    parts=split3(mask.T if rows else mask, n)     # 石板是从上到下排的,按行切
    if not parts: return None
    return [rgba.crop(b) for b in boxes(mask, parts, 1 if rows else 0)]
atlas={}; problems=[]
def save(im,name,k,ky=None):
    w,h=im.size[0]*k,im.size[1]*(ky or k)
    im.resize((max(1,round(w*PX)),max(1,round(h*PX))),Image.LANCZOS).save(f'{OUT}/{name}.webp','WEBP',quality=90,method=4)
    atlas[name]={'w':round(w,1),'h':round(h,1)}
# 石板:完好的那一条宽 354pt(和彩纸那一屏一样),五条用同一个比例
sp=cut('slabs.png',5,rows=True,green=True)
if sp:
    k=354/(sp[0].size[0]-6)
    # 模型画的石板比彩纸那一屏的厚:354pt 宽的时候有 90pt 高,而四条石板的间距只有 88pt。
    # 这里把高度压到 82pt(压扁 9%),好放进原来的格子。下次出图应该直接按 354:82 的比例要。
    ky=82/sp[0].size[1]
    # "沉回矿壁"的那一条模型画成了偏橙的沙土色(#d3b48a),比矿壁(#b19576)亮、也更鲜,四条里有三条是它的时候很抢眼。
    # 把它整体往矿壁的颜色拉:三个通道各乘一个数,让中间的颜色落在 #bfa381。只动颜色,不动形状。
    d=np.asarray(sp[4]).astype(np.float64); body=d[d[...,3]>200][:,:3]; gain=np.array([0xbf,0xa3,0x81])/np.median(body,0)
    d[...,:3]=np.clip(d[...,:3]*gain,0,255); sp[4]=Image.fromarray(d.round().astype(np.uint8),'RGBA')
    for n,s in zip(['idle','hit','miss','answer','dim'],sp): save(s,'slab-'+n,k,ky)
else: problems.append('slabs')
# 矿石:七个用同一个比例,所以一级比一级大是画出来的;钻石约 42pt 高
sp=cut('ores.png',7)
if sp:
    k=42/sp[6].size[1]
    for i,s in enumerate(sp): save(s,f'ore-{i+1}',k)
else: problems.append('ores')
# 词牌 268pt 宽(连两根木条),镐约 62pt 高,垫矿石的石片 48pt 宽
sp=cut('props.png',3,green=True)
if sp:
    # 词牌也比彩纸那一屏的高(牌面 124pt,原来是 112pt),下沿会压到矿壁上,压扁 6%
    ks=270/sp[0].size[0]
    save(sp[0],'sign',ks,ks*0.94); save(sp[1],'pick',62/sp[1].size[1]); save(sp[2],'pad',48/sp[2].size[0])
else: problems.append('props')
Image.open('bg2.png').convert('RGB').resize((780,1688),Image.LANCZOS).save(f'{OUT}/mine-bg.webp','WEBP',quality=86,method=6)
json.dump(atlas,open(f'{OUT}/atlas.json','w'),ensure_ascii=False,indent=0)
open(f'{OUT}/atlas.js','w').write('// 矿洞素材的清单:每个素材在屏幕上的宽和高(pt)。由切图的脚本写出来,不要手改。\n(window.LD = window.LD || {}).celMineSprites = '+json.dumps(atlas,ensure_ascii=False)+';\n')
print(len(atlas),'个素材', sum(os.path.getsize(f'{OUT}/{f}') for f in os.listdir(OUT) if f.endswith('.webp'))//1024,'KB', atlas); print('问题:',problems)
