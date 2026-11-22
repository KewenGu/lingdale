# 把一张"一行三个"的素材图切成三个带透明底的小图。
# 背景是模型画的纯色(多数是浅蓝,有一张是紫色),取四边的颜色当背景色,把接近背景色的像素去掉。
import numpy as np, sys, os, json
from PIL import Image, ImageDraw, ImageFilter
def cutout(im, lo=26, hi=58):
    # 整张图按颜色抠:离背景色近的像素全部去掉,不管它和四边连不连着。
    # 第一版只从四边往里抠,被枝叶围住的地方(葡萄架中间、支架和茎之间)抠不到,留着一块块背景色。
    # 作物身上没有接近背景的浅蓝色,所以这样抠不会伤到作物;模型画在土堆下面的那点蓝色的影子也一起去掉了。
    a=np.asarray(im.convert('RGB')).astype(np.float64); H,W,_=a.shape
    edge=np.concatenate([a[:6].reshape(-1,3),a[-6:].reshape(-1,3),a[:,:6].reshape(-1,3),a[:,-6:].reshape(-1,3)])
    bg=np.median(edge,0)
    dist=np.sqrt(((a-bg)**2).sum(-1))
    alpha=np.clip((dist-lo)/(hi-lo),0,1)
    # 边上的像素是作物的颜色和背景色混出来的,把混进去的背景色减掉,不然抠出来带一圈蓝边
    al=np.maximum(alpha,0.05)[...,None]
    rgb=np.clip((a-(1-al)*bg)/al,0,255)
    out=np.dstack([rgb,alpha*255]).round().astype(np.uint8)
    return Image.fromarray(out,'RGBA'), alpha>0.5, bg
def split3(mask, n=3):
    # 按列投影找最宽的 n-1 条空隙,切成 n 段。零星的土屑不算内容。
    col=mask.sum(0); W=len(col); has=col>mask.shape[0]*0.004
    gaps=[]; x=0
    while x<W:
        if not has[x]:
            x0=x
            while x<W and not has[x]: x+=1
            if x0>0 and x<W: gaps.append((x-x0,x0,x))
        else: x+=1
    gaps=sorted(gaps,reverse=True)[:n-1]
    if len(gaps)<n-1: return None
    cuts=[0]+sorted((g[1]+g[2])//2 for g in gaps)+[W]
    return [(cuts[i],cuts[i+1]) for i in range(n)]
def sprites(path, n=3):
    im=Image.open(path); rgba,mask,bg=cutout(im); parts=split3(mask,n)
    if not parts: return None
    out=[]
    for x0,x1 in parts:
        m=mask[:,x0:x1]; ys=np.where(m.sum(1)>2)[0]; xs=np.where(m.sum(0)>2)[0]
        box=(x0+xs.min()-3, max(ys.min()-3,0), x0+xs.max()+4, min(ys.max()+4,mask.shape[0]))
        out.append(rgba.crop(box))
    return out
if __name__=='__main__':
    from sheets import CROPS
    o=Image.new('RGB',(12*330,360),(207,230,166)); x=0
    for cid in CROPS:
        sp=sprites(f'healthy-{cid}.png')
        if not sp: print(cid,'切不开'); continue
        print(cid,[s.size for s in sp])
        for s in sp:
            t=s.resize((round(s.size[0]*0.33),round(s.size[1]*0.33))); o.paste(t,(x,350-t.size[1]),t); x+=t.size[0]+8
    o.crop((0,0,x,360)).save('slice-test.png')
