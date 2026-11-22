# 只调底色:把偏黄的草地色(色相 62° 到 100° 之间、不太深不太艳的像素)拉向彩纸草地的色相(约 86°),别的颜色不动。
# 是往一个目标色相拉,不是统一加一个角度:牧场的草地上黄下绿,统一加会把下面调过头。
# 干土(约 35°)、草垛和穗(约 45°)、蔫了的黄叶(约 50° 到 58°)、深绿的叶子(100° 以上)都在范围之外。
import numpy as np, sys
from PIL import Image
def rgb2hsv(a):
    r,g,b=a[...,0],a[...,1],a[...,2]; mx=a.max(-1); mn=a.min(-1); d=mx-mn
    h=np.zeros_like(mx); m=d>1e-6
    i=m&(mx==r); h[i]=((g-b)[i]/d[i])%6
    i=m&(mx==g)&(mx!=r); h[i]=(b-r)[i]/d[i]+2
    i=m&(mx==b)&(mx!=r)&(mx!=g); h[i]=(r-g)[i]/d[i]+4
    return h*60, np.where(mx>1e-6,d/np.maximum(mx,1e-6),0), mx
def hsv2rgb(h,s,v):
    h=(h%360)/60; i=np.floor(h).astype(int); f=h-i; p=v*(1-s); q=v*(1-s*f); t=v*(1-s*(1-f))
    out=np.zeros(h.shape+(3,))
    for k,(a,b,c) in enumerate([(v,t,p),(q,v,p),(p,v,t),(p,q,v),(t,p,v),(v,p,q)]):
        m=i%6==k; out[m]=np.stack([a,b,c],-1)[m]
    return out
def ramp(x,a,b): return np.clip((x-a)/(b-a),0,1)
def regreen(im, target=86.0, pull=0.85, sat=1.12):
    a=np.asarray(im.convert('RGB')).astype(np.float64)/255; h,s,v=rgb2hsv(a)
    w=ramp(h,60,68)*(1-ramp(h,92,102))*ramp(s,0.10,0.18)*(1-ramp(s,0.55,0.70))*ramp(v,0.50,0.62)
    out=hsv2rgb(h+w*pull*(target-h), np.clip(s*(1+(sat-1)*w),0,1), v)
    return Image.fromarray((np.clip(out,0,1)*255).round().astype(np.uint8)), w
if __name__=='__main__':
    for src,dst in [('final-farm.png','final2-farm.png'),('v2-pasture.png','final2-pasture.png')]:
        im,w=regreen(Image.open(src)); im.save(dst); print(dst,'改动的像素占',round(float((w>0.5).mean())*100),'%')
