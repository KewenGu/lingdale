# 十二种作物之外还要的几样:所有作物共用的种子和发芽、三种地块、农场的背景。
import os, sys, json, base64, time
from sheets import post, STYLE, BG, REF, ARK
def b64(p): return 'data:image/png;base64,'+base64.b64encode(open(p,'rb').read()).decode()
JOBS={
 'healthy-shared':(("游戏素材图:一行三个小图,等距排开,互不接触、互不遮挡,每一个都完整。"+BG+
   "只画东西本身,从侧面略微俯视。左边:一个小土堆,里面刚种下种子,土堆旁边插着一块白色的小木牌,木牌上画着一片小绿叶,没有字。"
   "中间:一小撮土上刚冒出来的嫩芽,只有两片圆圆的子叶,鲜绿挺立。右边:和中间一样的嫩芽,稍大一点,两片圆圆的子叶中间冒出一点新叶。"+STYLE),'2688x1152',REF),
 'tiles':(("游戏素材图:一行三块方形的地块,等距排开,互不接触,三块的形状和大小完全相同,都是从正上方看的圆角方形的一块土,边缘略微不整齐,有一点厚度。"+BG+
   "地块上没有任何植物、没有牌子。左边:浅砂色的干土(#e6c08a),表面干燥,有几粒小石子。中间:可可色的湿土(#a06a47),刚浇过水,颜色明显更深。"
   "右边:浅褐色的空地(#b5805a),上面翻出三道横向的垄。"+STYLE),'2688x1152',REF),
 'farm-bg':(("把参考图重新画一遍。这是一款手机游戏农场画面的背景,竖屏。必须和参考图保持完全相同的构图:上方是一条窄窄的远景(天空、太阳、几座红屋顶的小房子、圆圆的树、一排白色的矮栅栏),"
   "下面是一大片平整的草地,草地上什么都没有,只在最下面有几丛小草和几朵小白花。不要在草地上画任何地块、作物、路和东西。"
   "配色:整体色调必须和参考图一致,浅、亮、柔和、对比度低,像彩色纸的颜色:草地是很浅的黄绿色(#cfe6a6),最下面一段是稍深一点的绿(#a9cf7c),天空是很浅的蓝(#d3ecf2)。"
   "暗部只比亮部深一点点,不要强烈的光影。线稿用柔和的浅褐色,线条细。"
   "画法:日系动画风格的游戏场景插画,偏插画的赛璐璐:干净的线稿,以平涂为主,每种颜色一层硬边的暗部。画面里没有任何文字、数字、按钮和界面,没有人物。"),'1440x3116','src-farm-bg.png'),
}
EDIT={'stunted-shared':("修改这张图:三样东西的位置、大小、画法和背景都保持完全不变,只做两处改动:中间和右边的两株嫩芽都整株明显地歪向右边,并且各有一片子叶变成黄色。左边的土堆和木牌不变。没有文字。",'healthy-shared.png'),
      'wilted-shared':("修改这张图:三样东西的位置、画法和背景都保持完全不变,把中间和右边的两株嫩芽改成蔫了、枯萎的样子:茎向下弯,子叶全部变成黄色并且下垂。左边的土堆和木牌不变。没有文字。",'healthy-shared.png')}
def run(name,prompt,size,ref):
    out=name+'.png'
    if os.path.exists(out): print(out,'skip'); return
    refdata=ref if ref.startswith('data:') else b64(ref)
    for i in range(5):
        t=time.time(); st,d=post({'model':ARK,'prompt':prompt,'size':size,'response_format':'b64_json','watermark':False,'image':refdata})
        if st==429: time.sleep(25*(i+1)); continue
        meta={'file':out,'model':ARK,'prompt':prompt,'reference':'农场的重画' if ref.startswith('data:') else ref,'seconds':round(time.time()-t,1),'status':st,'usage':d.get('usage'),'date':time.strftime('%Y-%m-%d')}
        if st==200: open(out,'wb').write(base64.b64decode(d['data'][0]['b64_json']))
        else: meta['error']=str(d.get('error'))[:300]
        json.dump(meta,open(name+'.json','w'),ensure_ascii=False,indent=1); print(out,st,meta.get('error','')); return
for n,(p,size,ref) in JOBS.items(): run(n,p,size,ref)
for n,(p,ref) in EDIT.items(): run(n,p,'2688x1152',ref)
