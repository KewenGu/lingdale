# 一种作物一张九宫格:三列是三个生长阶段,三行是健康、不生长、枯萎。只画植株,不画地块,纯色背景方便抠出来。
import os, sys, json, base64, time, urllib.request, concurrent.futures as cf
ARK='doubao-seedream-5-5-261028'
CROPS={
 'turnip':('萝卜','低矮的一丛直立的长叶','两三片直立的小长叶','一丛茂盛的直立长叶,还看不到根','叶子茂盛,白色带淡粉色的圆根肩从土里露出来'),
 'potato':('土豆','蓬松的圆形矮灌丛','几片小圆叶的矮苗','蓬松的圆灌丛,没有花','圆灌丛上开着几朵小白花,根部的土边露出两个黄褐色的土豆'),
 'strawberry':('草莓','贴着地面的三出叶','一小丛贴地的三出叶','更大的一丛贴地的三出叶,没有果','叶丛间有小白花和三颗红色的草莓'),
 'tomato':('番茄','沿着一根细木支架向上长','一株矮矮的小苗,旁边一根细木支架','沿支架长高的植株,有几颗青色的小果','沿支架长高的植株,挂着几颗红色的圆番茄'),
 'corn':('玉米','一根直立的高秆,长叶向两边弯','矮矮的直秆,两三片向两边弯的长叶','高高的直秆,长叶向两边弯,没有玉米棒','高高的直秆,顶上有穗,秆上有一根露出黄色籽粒的玉米棒'),
 'melon':('西瓜','贴着地面的藤和裂叶','一小段贴地的藤,两三片裂叶','更长的贴地的藤和裂叶,没有瓜','贴地的藤和裂叶,旁边一个深浅绿条纹的圆西瓜'),
 'eggplant':('茄子','中等高的灌丛,大叶','几片大叶的小苗','中等高的大叶灌丛,开着一朵紫色的小花,没有果','大叶灌丛上垂着两根深紫色的长茄子'),
 'pumpkin':('南瓜','贴着地面的藤和大圆叶','一小段贴地的藤,两片大圆叶','更长的贴地的藤和几片大圆叶,没有瓜','贴地的藤和大圆叶,旁边一个橙色带棱的扁圆南瓜'),
 'grape':('葡萄','攀在一个小木架上的藤','小木架下刚爬上去的一小段藤和两片叶子','爬满小木架的藤和叶子,没有果','爬满小木架的藤和叶子,挂着一串紫色的葡萄'),
 'cabbage':('白菜','一整颗包起来的菜头','几片散开的小嫩叶','叶子开始向里包的半大的菜','一整颗包紧的白菜,白色的菜帮,淡黄绿色的叶子'),
 'leek':('韭葱','直立的扇形蓝绿色扁叶','三四根细细的直立扁叶','一把直立的扇形蓝绿色扁叶,还看不到葱白','直立的扇形蓝绿色扁叶,下面露出一截白色的葱白'),
 'snowpea':('雪豆','沿着一根细杆攀爬,有卷须','细杆旁刚开始攀爬的小苗,有卷须','沿细杆爬高的藤,有卷须和叶子,没有豆荚','沿细杆爬高的藤,开着小白花,挂着几个扁平的浅绿色豆荚'),
}
STYLE=("画法和参考图里的作物完全一致:日系动画风格的游戏插画,偏插画的赛璐璐,干净的浅褐色细线稿,平涂为主,每种颜色一层硬边的暗部。"
 "配色浅、亮、柔和、对比度低:叶子是明亮的绿色,暗部只比亮部深一点点,不要深色的投影。没有文字,没有数字,没有边框,没有格子线。")
BG="背景是纯色的浅蓝色(#a8d8f0),整张图背景完全一样,没有渐变,没有地面,没有方形的土块,没有阴影。"
# 只有这三种作物有支架。对别的作物提"支架",模型会给它添一根
SUPPORT={'tomato':'木支架原样不动。','grape':'木架的每一根木头都原样不动。','snowpea':'细杆原样不动。'}
def prompt(cid, kind='healthy'):
    name,shape,s2,s3,s4=CROPS[cid]
    if kind=='healthy':
        return (f"游戏素材图:一行三个小图,等距排开,互不接触、互不遮挡,每一个都完整。"+BG+
         f"三个画的是同一种作物:{name}({shape})的三个生长阶段,从左到右一个比一个大。只画植株本身和根部的一小撮土,从侧面略微俯视,三株都健康,叶子鲜绿挺立。"
         f"左边是幼苗:{s2}。中间是成株:{s3}。右边是成熟:{s4}。"+STYLE)
    if kind=='stunted':
        return ("修改这张图:三株植物的位置、大小、种类、画法和背景都保持完全不变,只做两处改动:每一株都整株明显地歪向右边(像没有精神),并且每一株各有一片叶子变成黄色。"
                "其余的叶子仍然是绿色的,果实不变。"+SUPPORT.get(cid,'')+"不要增加或减少任何东西,没有文字。")
    return ("修改这张图:三株植物的位置、种类、画法和背景都保持完全不变,把三株都改成蔫了、枯萎的样子:茎向下弯,所有的叶子都变成黄色和黄褐色并且下垂,"
            "原来有果实和花的,颜色变得发灰、发暗;原来没有花、没有果实的,不要画出花和果实。植株还在原来的位置,根部的土不变。"+SUPPORT.get(cid,'画面里没有支架和木棍,不要画出来。')+"不要增加或减少任何东西,没有文字。")
def post(body):
    req=urllib.request.Request('https://ark.cn-beijing.volces.com/api/v3/images/generations',data=json.dumps(body).encode(),headers={'Authorization':'Bearer '+os.environ['ARK_API_KEY'],'Content-Type':'application/json'})
    try:
        with urllib.request.urlopen(req,timeout=600) as r: return r.status,json.loads(r.read())
    except urllib.error.HTTPError as e:
        try: return e.code,json.loads(e.read())
        except Exception: return e.code,{}
REF='data:image/png;base64,'+base64.b64encode(open('ref-farm.png','rb').read()).decode()
def run(a):
    cid,kind=a; out=f'{kind}-{cid}.png'
    if os.path.exists(out): return out,'skip'
    p=prompt(cid,kind); err=''
    # 健康的那张用农场的重画当参考图,对齐画法;不生长和枯萎的两张是在健康那张上改
    ref=REF if kind=='healthy' else 'data:image/png;base64,'+base64.b64encode(open(f'healthy-{cid}.png','rb').read()).decode()
    for i in range(5):
        try:
            t=time.time(); st,d=post({'model':ARK,'prompt':p,'size':'2688x1152','response_format':'b64_json','watermark':False,'image':ref})
            meta={'file':out,'model':ARK,'prompt':p,'reference':'农场的重画' if kind=='healthy' else f'healthy-{cid}','seconds':round(time.time()-t,1),'status':st,'usage':d.get('usage'),'date':time.strftime('%Y-%m-%d')}
            if st==429:
                time.sleep(25*(i+1)); continue   # 限流:等一会儿再试,不记成失败
            if st==200: open(out,'wb').write(base64.b64decode(d['data'][0]['b64_json']))
            else: meta['error']=str(d.get('error'))[:300]
            json.dump(meta,open(out.replace('.png','.json'),'w'),ensure_ascii=False,indent=1)
            return out,st,meta.get('error','')
        except Exception as e: err=repr(e)[:100]; time.sleep(3)
    return out,'failed',err
if __name__=='__main__':
    kind=sys.argv[1]; ids=sys.argv[2:] or list(CROPS)
    with cf.ThreadPoolExecutor(2) as ex:
        for r in ex.map(run,[(c,kind) for c in ids]): print(r,flush=True)
