# 把一张重画出来的图整体调回彩纸的色调:拿它和彩纸的原稿对应位置的大块颜色配对,拟合一个二次的颜色换算,整张图用同一个换算。
# 不分区域,所以不会有重影;只在构图对得上的时候能用(背景、整屏重画)。regreen.py 只管草地的色相,这个管整体。
import sys
import numpy as np
from PIL import Image, ImageFilter
def feats(x):
    r,g,b=x[:,0],x[:,1],x[:,2]
    return np.stack([np.ones_like(r),r,g,b,r*r,g*g,b*b,r*g,r*b,g*b],1)
def grade(img, src):
    small=(195,422)
    a=np.asarray(img.filter(ImageFilter.GaussianBlur(9)).resize(small)).reshape(-1,3)/255.0
    b=np.asarray(src.resize(img.size).filter(ImageFilter.GaussianBlur(5)).resize(small)).reshape(-1,3)/255.0
    M,_,_,_=np.linalg.lstsq(feats(a),b,rcond=None)
    W,H=img.size
    out=np.clip(feats(np.asarray(img).reshape(-1,3)/255.0)@M,0,1).reshape(H,W,3)
    return Image.fromarray((out*255).round().astype(np.uint8))
if __name__=='__main__':
    grade(Image.open(sys.argv[1]).convert('RGB'), Image.open(sys.argv[2]).convert('RGB')).save(sys.argv[3])
