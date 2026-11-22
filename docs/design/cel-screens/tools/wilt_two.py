# 给重画的三种作物(南瓜、白菜、韭葱)出枯萎的图:只出幼苗和成株两株,成熟的不画枯萎。
# 做法是把健康的那张最右边成熟的一株抹成背景色,再让模型把剩下的两株改成蔫了的样子。
# 这样模型面前只有要改的东西,少了"一行三株里留一株不动"的毛病。
import os, sys, json, base64, time, io
import numpy as np
from PIL import Image
from slice import cutout, split3
from sheets import post, ARK
P=("修改这张图:图里有两株植物。它们的位置、种类、大小、画法和背景都保持完全不变,把两株都改成缺水蔫了的样子:叶子和茎的形状不变,只是都软软地垂下来,"
   "叶子的颜色全部变成柔和的浅黄色和黄绿色。两株都要改:每一株的每一片叶子都要变成浅黄色并且垂下来,画面里不能留下任何一片鲜绿色、挺立的叶子。"
   "只是蔫了、没精神,浇了水就能恢复,不是坏了、死了:不要褐色和黑色,不要枯干卷曲和破损的叶子,不要斑点。"
   # 提到"花"的时候要小心:第一遍这里写了"花保持原来的颜色",没有花的白菜被画上了花。只对有花的作物说
   "{flower}植株还在原来的位置,根部的土不变。画面里没有支架和木棍,不要画出来。不要增加别的植物,没有文字。")
FLOWER={'pumpkin':'花保持原来的形状和颜色,只是稍微淡一点。','cabbage':'白菜没有花,没有花茎,不要画出花。','leek':'韭葱没有花,不要画出花。'}
for cid in sys.argv[1:]:
    im=Image.open(f'healthy-{cid}.png').convert('RGB'); rgba,mask,bg=cutout(im); parts=split3(mask)
    a=np.asarray(im).copy(); a[:, parts[2][0]:]=bg.round().astype(np.uint8)
    buf=io.BytesIO(); Image.fromarray(a).save(buf,'PNG'); p=P.format(flower=FLOWER.get(cid,''))
    for i in range(5):
        t=time.time(); st,d=post({'model':ARK,'prompt':p,'size':'2688x1152','response_format':'b64_json','watermark':False,'image':'data:image/png;base64,'+base64.b64encode(buf.getvalue()).decode()})
        if st==429: time.sleep(25*(i+1)); continue
        if st==200: open(f'wilted-{cid}.png','wb').write(base64.b64decode(d['data'][0]['b64_json']))
        json.dump({'file':f'wilted-{cid}.png','model':ARK,'prompt':p,'reference':f'healthy-{cid}(抹掉了成熟的那一株)','seconds':round(time.time()-t,1),'status':st,'usage':d.get('usage'),'date':time.strftime('%Y-%m-%d')},open(f'wilted-{cid}.json','w'),ensure_ascii=False,indent=1); print(cid,st); break
