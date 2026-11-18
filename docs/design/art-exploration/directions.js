// 四个方向的文字说明、评估和生成提示词。画面本身在 style-*.js 里,配色色卡直接取自各画风实际用到的颜色。
// 评估是判断,不是数据;依据写在每一条里。
(function () {
  'use strict';
  var LD = window.LD;

  /** 画风要回答的七个问题,来自这次任务的要求。 */
  LD.requirements = [
    { id: 'state', name: '状态一眼可辨', note: '能浇水、枯萎、快收获,扫一眼就分得出' },
    { id: 'small', name: '竖屏和小尺寸', note: '30 块一屏放下,120 块缩小后仍可辨认' },
    { id: 'town', name: '是田园小镇,不是修仙', note: '把"灵谷"这个名字带来的误会拉回来' },
    { id: 'mood', name: '治愈、有期待感', note: '枯萎看得出来,但不吓人' },
    { id: 'crops', name: '12 种作物分得开', note: '小尺寸下靠轮廓和一个点睛的颜色' },
    { id: 'social', name: '社交媒体画面', note: '小红书 3:4 封面、图文组、竖屏短视频' },
    { id: 'solo', name: '一个人能持续产出', note: '一个人加 AI 协助,长期做下去' },
  ];

  LD.levelText = { strong: '强', ok: '中', weak: '弱' };

  var NEG_ZH = '画面里没有人物,没有文字,没有界面,没有魔法特效,没有发光的光晕,没有云雾和仙山。';
  var NEG_EN =
    'No characters, no text, no UI, no magic effects, no glowing aura, no mist, no fantasy mountains.';

  var SHEET_LIST_ZH =
    '萝卜、土豆、草莓、支架上的番茄、玉米、西瓜、茄子、南瓜、小架子上的葡萄、白菜、韭葱、细杆上的雪豆';
  var SHEET_LIST_EN =
    'turnip, potato plant, strawberry, tomato on a stake, corn stalk, watermelon, eggplant, pumpkin, grapes on a small trellis, napa cabbage, leek, snow peas on a thin pole';

  LD.directions = [
    {
      id: 'pixel',
      letter: 'A',
      name: '像素菜园',
      oneLine: '低分辨率、限定色板的像素画,像一块小小的电子菜园。',
      look:
        '整屏按"1 个美术像素 = 4pt"来画,地块 16×16 像素,作物画在 16×24 的格子里。所有图形落在整数像素格上,' +
        '没有抗锯齿和渐变。描边用深褐紫色而不是纯黑,每种颜色只配一个暗部色,整体偏暖。',
      fontNote:
        '界面用 12 像素的中文像素字体(示意稿里是开源的 Fusion Pixel)。气质是复古、游戏感强。' +
        '但单词和释义是这个产品的正文,像素字体在长释义和音标上的可读性明显不如普通字体,' +
        '下面的样张里能看到:这个字体没有音标里的 ə 和重音符号,会退回成别的字体。' +
        '正式做时答题界面很可能要换成普通的圆体,像素字体只留给数字和标题。',
      fontFamily: '"Fusion Pixel 12px Proportional SC", monospace',
      drawing:
        '地块是带 1 像素描边的方格砖,干土浅、湿土深。作物是手摆像素的小精灵,靠轮廓和两三个高饱和的像素点区分。' +
        '环境是草地、木栅栏和远处几座红瓦小屋。',
      states: [
        ['能浇水', '浅色干土,右上角白色气泡里一个蓝色水滴'],
        ['今天浇过了', '深色湿土,没有标记'],
        ['不生长', '左上一片叶子发黄,上半截错开 1 像素'],
        ['枯萎', '叶子垂到两侧,换成橄榄色配枯黄的叶尖,根部留一点绿'],
        ['品质', '地块下沿的木板上 5 个钉点,亮黄是剩下的星'],
        ['浇对就收获', '左上角一个带描边的金色四角星'],
      ],
      pros: [
        '硬边、高对比,状态标记在小尺寸下最清楚。',
        '一眼就是"游戏",不会被当成又一个学习工具。',
        '单张素材很小,包体压力最低;帧动画只要两三帧就有生气。',
        '有一批稳定喜欢像素风的受众,B 站和小黑盒上尤其多。',
      ],
      risks: [
        '像素风的种田游戏已经很多,其中最有名的那一款正是像素画。即使每个像素都是自己画的,' +
          '评论区出现"抄某某"的概率也是四个方向里最高的,而我们的选题里本来就要拿它做对比。',
        '只能按整数倍缩放。120 块地的全景要么换一套更小的精灵,要么只能缩到 1/2,中间的比例会糊。',
        '中文像素字体对长释义、音标不友好,答题界面大概率要破例用普通字体,风格会被打断。',
        '16 像素宽的格子里,12 种作物靠的就是几个像素的差别,土豆和茄子、西瓜和南瓜这样的组合要反复调。',
      ],
      sustain:
        '中等。单张工作量小,一个人画得动。但 AI 图像工具生成的"像素画"通常像素大小不一、格子对不齐、颜色超出色板' +
        '(这是我对这类工具的了解,没有在这个项目里实测),基本只能当参考,每一张都要自己在像素工具里重画或清理。' +
        '枯萎不能靠旋转来做。示意稿里只有草莓成株和土豆幼苗的枯萎是手画的,其余用程序变形(换色加逐行错位),' +
        '效果明显差一截,玉米会碎,灌丛像塌掉。结论是每种作物、每个形态的枯萎都要单独画一张。',
      verdict: {
        state: ['strong', '硬边和高对比,水滴在 28px 下仍然清楚'],
        small: ['ok', '整数倍缩小很清楚,但 120 块全景的缩放比例受限'],
        town: ['strong', '草地、栅栏、红瓦小屋,一眼是农场游戏'],
        mood: ['ok', '亲切、怀旧;治愈感取决于配色,天然不如手绘柔和'],
        crops: ['ok', '分得开,但余量很小,靠几个像素'],
        social: ['ok', '在游戏社区讨喜;在小红书上偏小众,容易被归到"又一个像素种田"'],
        solo: ['ok', '单张便宜,但 AI 帮不上太多,状态变体要多画'],
      },
      prompts: {
        sceneZh:
          '像素画,俯视视角,一款治愈系手机游戏里的小菜园,竖版 3:4。明亮的草地上,一圈木栅栏围着整齐的 5 列 6 行方形土地。' +
          '每块地里一株处在不同生长阶段的蔬菜:土堆里的种子、刚冒头的嫩芽、叶子茂盛的萝卜、开着小白花的土豆、结着红果的草莓、' +
          '沿支架生长的番茄、高高的玉米、一个条纹西瓜。有的地是浅色的干土,有的是深色的湿土;有一两株蔫了,叶子发黄下垂。' +
          '远处有几座红瓦屋顶带烟囱的小屋,淡蓝色的天空。16×16 像素的图块,像素颗粒清晰可见,大约 24 色的暖色限定色板,' +
          '描边用深褐紫色而不是黑色,每种颜色只有一个暗部色,没有抗锯齿,没有渐变,没有模糊。温暖的日光,安静愉快的乡村气氛。' +
          NEG_ZH,
        sceneEn:
          'Pixel art, top-down view of a small vegetable garden for a cozy mobile game, portrait 3:4. On bright green grass, a wooden fence ' +
          'surrounds a tidy grid of square soil plots, five columns by six rows. Each plot holds one vegetable at a different growth stage: ' +
          'seeds in a small mound, tiny sprouts, leafy turnips, bushy potato plants with small white flowers, strawberries with red fruit, ' +
          'tomato plants on stakes, tall corn, one striped watermelon. Some plots are light dry soil, others dark watered soil; one or two ' +
          'plants are drooping with yellowish leaves. In the distance, a few small cottages with red tiled roofs and chimneys under a pale ' +
          'blue sky. 16x16 pixel tiles, chunky clearly visible pixels, limited palette of about 24 warm colors, dark plum-brown outlines ' +
          'instead of black, one shadow tone per color, no anti-aliasing, no gradients, no blur. Warm daylight, calm and cheerful countryside mood. ' +
          NEG_EN,
        sheetZh:
          '像素画精灵表,浅色纯色背景。十二种蔬菜排成 4 列 3 行,每种长在一小块方形的土上,间距均匀,大小一致:' +
          SHEET_LIST_ZH +
          '。每株都处在开花结果的状态,能看到成熟的果实或可食用的部分。16×24 像素的精灵,像素颗粒清晰,暖色限定色板,' +
          '深褐紫色描边,没有抗锯齿,没有渐变。没有文字,没有标签。',
        sheetEn:
          'Pixel art sprite sheet on a plain light background. Twelve vegetables arranged in a grid of four columns and three rows, each ' +
          'growing on its own small square of soil, evenly spaced, same scale: ' +
          SHEET_LIST_EN +
          '. Each plant is flowering with its ripe fruit or edible part visible. 16x24 pixel sprites, chunky visible pixels, limited warm ' +
          'palette, dark plum-brown outlines, no anti-aliasing, no gradients. No text, no labels.',
      },
    },
    {
      id: 'watercolor',
      letter: 'B',
      name: '水彩绘本',
      oneLine: '像手绘绘本里的一页:铅笔线稿、透明的淡彩、纸的肌理。',
      look:
        '底是一张暖白色的水彩纸。颜色薄而透明,边缘不规则,干了以后边上留一圈略深的水渍;' +
        '铅笔线略有抖动、粗细不匀,和色块有一点错位。留白很多,整体松弛、安静。',
      fontNote:
        '用开源的霞鹜文楷。它是楷体,带一点课本和绘本的感觉,和"学单词"这件事贴合;' +
        '单词、音标、释义的可读性都好。要避免的是把它处理成毛笔题字或印章,那会滑向国风。',
      fontFamily: '"LXGW WenKai TC", "Noto Serif SC", serif',
      drawing:
        '地块不是整齐的瓷砖,而是一块块手涂的土色圆角方形,大小略有出入。作物是铅笔勾形、水彩上色,叶子有浓淡。' +
        '画面上部是一小段远景:低缓的绿色山坡、几座红屋顶的小房子。',
      states: [
        ['能浇水', '很淡的生赭色干土,右上角一张白纸片上一滴蓝色的水彩水滴'],
        ['今天浇过了', '更深的熟褐色湿土,像刚刷过水'],
        ['不生长', '一片叶子涂成土黄,株型微微歪斜'],
        ['枯萎', '茎和叶朝地面垂下去,颜色换成土黄,更淡更干'],
        ['品质', '土块下方一排手画的小星,涂了藤黄的是剩下的,扣掉的只剩铅笔框'],
        ['浇对就收获', '左上角一个手画的小篮子'],
      ],
      pros: [
        '治愈感和田园感最强,最不可能被看成修仙,也最不像一个"应用"。',
        '和小红书上受欢迎的画面气质最接近,封面和图文组容易好看。',
        '手绘的不完美是这个画风的一部分,AI 生成的图里常见的小瑕疵在这里不那么刺眼。',
        '单词卡片、收获动画这些"值得截图"的瞬间,用这个画风最有感染力。',
      ],
      risks: [
        '状态的可辨认度最弱。水彩的边缘是软的,干土和湿土的对比天然不如纯色块,缩到 28px 时水滴和枯萎都要靠额外的标记来救。',
        '难在"成套"而不在"单张"。12 种作物、5 个形态、3 种健康状态,要求同一支笔、同一种纸、同一个光,' +
          'AI 逐张生成很容易每张各有各的笔触,拼在一个农场里会散。',
        '每张素材都是带透明边缘的位图,抠图麻烦,体积大。微信小游戏的主包上限据第三方资料是 4MB(未核对官方文档),' +
          '这个画风最容易顶到。',
        '动画成本高。水彩不适合用缩放旋转来假装生长,要么逐帧画,要么接受作物基本不动。',
      ],
      sustain:
        '中等偏难。出一张好看的图容易,出六十张放在一起不打架的图难。要靠一套固定的流程来压住:' +
        '固定参考图、固定提示词、每张生成后人工统一色调和描线。创作者本人如果会画,这个方向的上限最高;如果完全靠 AI,一致性是长期负担。',
      verdict: {
        state: ['weak', '软边、低对比,状态要靠额外的标记补强'],
        small: ['weak', '缩小后笔触糊成一片,枯萎基本看不出,是四个方向里掉得最快的'],
        town: ['strong', '田园绘本的气质最足,离修仙最远'],
        mood: ['strong', '最柔和、最安静,枯萎也只是蔫了'],
        crops: ['ok', '大图细节丰富,小图靠颜色,轮廓偏软'],
        social: ['strong', '最适合小红书的封面和图文'],
        solo: ['ok', '单张容易,成套一致很难;体积和动画都贵'],
      },
      prompts: {
        sceneZh:
          '手绘水彩加铅笔线稿的插画,像儿童绘本里的一页,竖版 3:4。从略高的角度看一个小菜园:白色水彩纸上,' +
          '5 列 6 行手涂的土色小方块,每块里一株处在不同生长阶段的蔬菜:土堆里的种子、嫩芽、叶子茂盛的萝卜、开小白花的土豆、' +
          '结红果的草莓、沿支架生长的番茄、高高的玉米、一个条纹西瓜。有的土是很淡的干土色,有的是刚浇过水的深褐色;' +
          '有一两株蔫了,叶子发黄下垂。画面上方是低缓的绿色山坡和几座红屋顶的小房子。透明的薄涂水彩,看得见纸纹,' +
          '颜料在边缘积成略深的水渍,柔软抖动的铅笔轮廓和颜色略有错位,大量留白。颜色是树汁绿、橄榄绿、生赭、熟褐、' +
          '一点茜红、土黄和天蓝。温柔、安静、晴朗的早晨。没有水墨山水,' +
          NEG_ZH,
        sceneEn:
          'Hand-painted watercolor and pencil illustration, like a page from a children\'s picture book, portrait 3:4. A small vegetable ' +
          'garden seen from slightly above: on white watercolor paper, five columns and six rows of hand-painted earthy square patches, each ' +
          'holding one vegetable at a different growth stage: seeds in a small mound, sprouts, leafy turnips, potato plants with small white ' +
          'flowers, strawberries with red fruit, tomato plants on stakes, tall corn, one striped watermelon. Some patches are pale dry soil, ' +
          'others dark freshly watered brown; one or two plants are drooping with yellowish leaves. Above the garden, gentle green hills and a ' +
          'few small houses with red roofs. Loose transparent washes, visible paper grain, pigment pooling into slightly darker edges, soft ' +
          'wobbly graphite outlines slightly offset from the color, plenty of unpainted white paper. Palette of sap green, olive, raw sienna, ' +
          'burnt umber, a touch of alizarin red, yellow ochre and cerulean blue. Gentle, quiet, sunny morning. No ink-wash landscape. ' +
          NEG_EN,
        sheetZh:
          '手绘水彩加铅笔线稿的图鉴页,白色水彩纸背景。十二种蔬菜排成 4 列 3 行,每种长在一小块手涂的土上,间距均匀,大小一致:' +
          SHEET_LIST_ZH +
          '。每株都处在开花结果的状态,能看到成熟的果实或可食用的部分。透明的薄涂水彩,看得见纸纹,边缘有水渍,' +
          '柔软抖动的铅笔轮廓,同一支笔、同一种光。没有文字,没有标签。',
        sheetEn:
          'Hand-painted watercolor and pencil reference sheet on white watercolor paper. Twelve vegetables arranged in a grid of four columns ' +
          'and three rows, each growing on its own small hand-painted patch of soil, evenly spaced, same scale: ' +
          SHEET_LIST_EN +
          '. Each plant is flowering with its ripe fruit or edible part visible. Loose transparent washes, visible paper grain, darker pooled ' +
          'edges, soft wobbly graphite outlines, consistent brush and lighting throughout. No text, no labels.',
      },
    },
    {
      id: 'paper',
      letter: 'C',
      name: '彩纸拼贴',
      oneLine: '用彩色纸片剪出来、一层层贴起来的农场:纯色块、圆润的几何形状、没有描边。',
      look:
        '一切都是剪出来的纸片:形状几何化、圆润,边缘干净,没有描边线和渐变,形体靠浅色纸叠在深色纸上来区分。' +
        '每一层纸在下方有一道很细的硬边投影,整屏叠一层很轻的纸纤维颗粒,带来手作的温度。',
      fontNote:
        '名称和封面标题用圆胖俏皮的站酷快乐体,界面和正文用 Baloo 2 配思源黑体,粗、圆、清楚。' +
        '单词和释义的可读性最好。风险是整体气质容易偏"应用",要靠形状的性格和标题字把游戏感撑住。',
      fontFamily: '"Baloo 2", "Noto Sans SC", sans-serif',
      displayFamily: '"ZCOOL KuaiLe", "Noto Sans SC", sans-serif',
      drawing:
        '地块是整齐的圆角方形纸片,排成 5×6,像一床拼布被面;干土是浅的暖砂色,湿土是深的可可色,对比很大。' +
        '作物由圆、半圆、水滴形叶片拼成,叶片夸张地圆胖,果实比例放大。',
      states: [
        ['能浇水', '浅砂色地块,右上角白色圆片上一个蓝色水滴,略微探出地块'],
        ['今天浇过了', '深可可色地块'],
        ['不生长', '一片叶子换成芥末黄,整株歪 9 度'],
        ['枯萎', '茎顶弯成钩,叶片转向下垂,颜色换成芥末黄和卡其色'],
        ['品质', '地块下沿一条纸带上 5 个圆点,亮黄的大点是剩下的星'],
        ['浇对就收获', '左上角一个橙底黄面的四角星纸片'],
      ],
      pros: [
        '状态最清楚。干土和湿土是两张颜色差很多的纸,水滴是一个饱和的蓝色图形,缩到很小都认得出。',
        '所有状态变化都能用"换颜色、转角度、挪位置"完成:枯萎是叶片转下去,生长是纸片放大弹出。' +
          '不用为每个状态多画一张图,动画用引擎的补间就能做。',
        '形状本身就是矢量,可以直接用代码或矢量工具产出,每一张的线条、颜色、比例天然一致。这份示意稿本身就是这样做出来的。',
        '导出的图片颜色少、压缩率高,包体压力小。',
      ],
      risks: [
        '容易显得像"应用插画"而不是"游戏"。很多学习应用用的就是扁平色块,做得不够有性格时,会被看成又一个背单词工具,而这正是我们要避开的。',
        '治愈感不是天然的,要靠配色、圆润的形状和纸的质感一点点调出来;调不好就是干净但冷。',
        '田园小镇的气质要靠画什么来建立(小屋、栅栏、水壶),画风本身不带这个暗示。',
        '在社交媒体上干净、清楚,但不容易让人停下来看第二眼,需要在封面构图和动效上多花心思。',
      ],
      sustain:
        '四个方向里最可持续。形状用代码或矢量工具画,AI 协助的方式是"帮忙写出和改动图形",而不是"生成一张图再去修",' +
        '所以不存在逐张风格漂移的问题。12 种作物、5 个形态画一次,健康状态和动画靠变换得到。' +
        '代价是它对创作者的形状设计要求更高:省下来的时间要花在把形状调得有性格上。',
      verdict: {
        state: ['strong', '明度对比大,标记是清晰的几何图形'],
        small: ['strong', '矢量形状任意缩放,28px 下仍然干净'],
        town: ['ok', '不像修仙,但田园感要靠画的内容来建立'],
        mood: ['ok', '明快友好;柔和与温度需要刻意经营'],
        crops: ['strong', '轮廓最清楚,颜色最纯'],
        social: ['ok', '封面清楚醒目,但偏"干净"而不是"惊艳"'],
        solo: ['strong', '代码或矢量直接产出,状态和动画靠变换'],
      },
      prompts: {
        sceneZh:
          '彩纸剪贴拼贴插画,竖版 3:4。一个完全由纯色纸片一层层贴出来的小菜园:浅草绿色的底纸上,5 列 6 行圆角方形的土色纸片,' +
          '每块上面贴着一株处在不同生长阶段的蔬菜:土堆里的种子、两片子叶的嫩芽、叶子圆胖的萝卜、开小白花的土豆、结红果的草莓、' +
          '沿支架生长的番茄、高高的玉米、一个条纹西瓜。有的地块是浅砂色的干土,有的是深可可色的湿土;有一两株蔫了,叶片朝下,颜色是芥末黄。' +
          '上方是几座剪纸的小房子(红屋顶、白墙)和圆圆的树。圆润的几何形状,哑光纯色,没有描边,没有渐变,' +
          '每一层纸在下面一层上投下一道细而清晰的影子,有细微的纸纤维质感,正上方俯拍,光线柔和均匀。' +
          '颜色:浅草绿、砂色和可可色的土、明亮的叶绿、番茄红、南瓜橙、玉米黄、茄紫、清澈的水蓝。俏皮、整洁、有手作感。' +
          NEG_ZH,
        sceneEn:
          'Cut-paper collage illustration, portrait 3:4. A small vegetable garden made entirely of flat pieces of colored paper layered on top ' +
          'of each other: on a light grass-green background sheet, five columns and six rows of rounded-square soil-colored paper patches, each ' +
          'with one vegetable at a different growth stage: seeds in a small mound, a sprout with two round leaves, a turnip with chubby leaves, ' +
          'potato plants with small white flowers, strawberries with red fruit, tomato plants on stakes, tall corn, one striped watermelon. Some ' +
          'patches are light sand-colored dry soil, others dark cocoa watered soil; one or two plants are drooping with mustard-yellow leaves. ' +
          'Above the garden, a few paper-cut cottages with red roofs and white walls, and round trees. Rounded geometric shapes, solid matte ' +
          'colors, no outlines, no gradients, each paper layer casting a thin crisp shadow on the layer below, subtle paper fiber texture, shot ' +
          'straight from above in soft even light. Palette: light grass green, sand and cocoa browns, bright leaf greens, tomato red, pumpkin ' +
          'orange, corn yellow, eggplant purple, clear water blue. Playful, tidy, handmade. ' +
          NEG_EN,
        sheetZh:
          '彩纸剪贴拼贴的图鉴页,浅草绿色纯色背景。十二种蔬菜排成 4 列 3 行,每种贴在一小块圆角方形的土色纸片上,间距均匀,大小一致:' +
          SHEET_LIST_ZH +
          '。每株都处在开花结果的状态,能看到成熟的果实或可食用的部分。圆润的几何形状,哑光纯色纸片,没有描边,没有渐变,' +
          '每层纸有一道细而清晰的投影。没有文字,没有标签。',
        sheetEn:
          'Cut-paper collage reference sheet on a plain light grass-green background. Twelve vegetables arranged in a grid of four columns ' +
          'and three rows, each on its own small rounded-square patch of soil-colored paper, evenly spaced, same scale: ' +
          SHEET_LIST_EN +
          '. Each plant is flowering with its ripe fruit or edible part visible. Rounded geometric shapes, solid matte paper colors, no ' +
          'outlines, no gradients, each layer casting a thin crisp shadow. No text, no labels.',
      },
    },
    {
      id: 'lowpoly',
      letter: 'D',
      name: '低多边形沙盘',
      oneLine: '一个低多边形 3D 的玩具农场沙盘,像桌面上的积木模型。',
      look:
        '每个物体由少量平面多边形构成,每个面是纯色,明暗只取决于面的朝向;物体在地面上投下一块硬边的影子。' +
        '没有描边,没有贴图。颜色干净、饱和,像哑光的塑料或木头玩具。',
      fontNote:
        '用圆润的几何体 Fredoka 配粗的思源黑体。气质是干净、现代、玩具感。可读性好。' +
        '界面是带一点厚度的 2D 面板,和 3D 场景分属两层。',
      fontFamily: '"Fredoka", "Noto Sans SC", sans-serif',
      drawing:
        '地块是带厚度的田垄,顶面的颜色区分干湿。作物由棱锥、棱柱、宝石形和斜放的面片搭成。' +
        '农场用俯视的斜投影,让 5×6 仍然横平竖直地排开;封面用真正的等轴测视角。',
      states: [
        ['能浇水', '田垄顶面是浅砂色,上方浮着一个白底蓝色水滴的 2D 标记'],
        ['今天浇过了', '田垄顶面是深可可色'],
        ['不生长', '一片叶面换成黄色,整株略歪'],
        ['枯萎', '叶面片向下折,颜色换成黄褐色,整体压低'],
        ['品质', '田垄前侧面上 5 个小菱形'],
        ['浇对就收获', '左上方浮着一个金色的 2D 小标记'],
      ],
      pros: [
        '有体积和光影,短视频里镜头一转就有看头:环绕、推近、昼夜变化,这些在 2D 画风里都要另外画。',
        '玩具沙盘的质感讨喜,"我的小农场"这种拥有感最强。',
        '一个模型可以从任何角度渲染,封面、图文、视频共用同一套资产。',
        '生长、摇晃、枯萎可以用骨骼或顶点动画来做,不必逐帧画。',
      ],
      risks: [
        '手机竖屏放不下 5×6 的等轴测菱形,只能改用俯视的斜投影;即便如此,高的作物仍然会挡住后一行,' +
          '这直接损害"扫一眼就看出状态"。示意稿里如实保留了这个遮挡。',
        '制作链条最长:建模、材质、灯光、导出、在引擎里调。12 种作物乘 5 个形态是 60 个模型,还没算枯萎和小镇的建筑。',
        '3D 在小游戏平台上的包体和性能压力比 2D 大。引擎支持在小游戏里跑 3D,但低端机上的表现没有核实。',
        'AI 对 3D 模型的协助目前不如对 2D 图像成熟(这是我的了解,未实测),大部分模型要自己建。',
      ],
      sustain:
        '四个方向里最难持续。它要求创作者会用三维软件,并且愿意长期维护一套模型资产。' +
        '一个折中是把 3D 模型预渲染成 2D 图片来用,那样可以省掉引擎里的 3D 成本,但建模的工作量一点没少。',
      verdict: {
        state: ['ok', '水滴浮在场景上方,很清楚;作物本身的状态会被前排挡住一部分'],
        small: ['ok', '干湿和水滴缩小后仍清楚,但作物缩成一小团,枯萎只能靠颜色'],
        town: ['ok', '玩具沙盘,不像修仙;田园感中等'],
        mood: ['ok', '明亮可爱,偏"精致模型"而不是"安静治愈"'],
        crops: ['ok', '体积帮助辨认高矮,但多边形少时形状趋同'],
        social: ['strong', '短视频最出彩,镜头运动自带看点'],
        solo: ['weak', '建模和 3D 管线对一个人来说负担最重'],
      },
      prompts: {
        sceneZh:
          '低多边形 3D 渲染,一个像玩具模型一样的小菜园沙盘,漂浮在淡蓝到淡绿的渐变背景上,竖版 3:4,等轴测视角。' +
          '一块有厚度的草地底座上,5 列 6 行凸起的田垄,每块上面一株处在不同生长阶段的蔬菜:土堆里的种子、嫩芽、萝卜、' +
          '开小白花的土豆、结红果的草莓、沿支架生长的番茄、高高的玉米、一个条纹西瓜。有的田垄顶面是浅砂色的干土,' +
          '有的是深褐色的湿土;有一两株蔫了,叶子下垂发黄。每株蔬菜由很少的平面多边形构成,棱角分明,没有贴图,没有描边,' +
          '柔和的定向日光,清晰的投影,哑光材质,干净明亮的饱和色。后面有几座红屋顶的低多边形小房子和锥形的树。' +
          '愉快、干净、微缩模型的感觉。没有雾,' +
          NEG_ZH,
        sceneEn:
          'Low-poly 3D render of a tiny toy-like vegetable garden diorama floating on a pale blue to pale green gradient background, portrait ' +
          '3:4, isometric camera. On a thick slab of grass, raised soil beds in a grid of five columns and six rows, each holding one vegetable ' +
          'at a different growth stage: seeds in a small mound, sprouts, turnips, potato plants with small white flowers, strawberries with red ' +
          'fruit, tomato plants on stakes, tall corn, one striped watermelon. Some beds have light sand-colored dry soil on top, others dark ' +
          'brown watered soil; one or two plants are drooping with yellowish leaves. Each vegetable is built from a small number of flat-shaded ' +
          'polygons, faceted, no textures, no outlines, soft directional sunlight with crisp shadows, matte materials, clean bright saturated ' +
          'colors. Behind the garden, a few low-poly cottages with red roofs and cone-shaped trees. Cheerful, clean, miniature model feel. No fog. ' +
          NEG_EN,
        sheetZh:
          '低多边形 3D 渲染的模型图鉴,淡蓝色纯色背景,等轴测视角。十二种蔬菜排成 4 列 3 行,每种长在一小块有厚度的方形田垄上,' +
          '间距均匀,大小一致,同一个光源:' +
          SHEET_LIST_ZH +
          '。每株都处在开花结果的状态,能看到成熟的果实或可食用的部分。平面着色的多边形,棱角分明,没有贴图,没有描边,' +
          '哑光材质,清晰的投影。没有文字,没有标签。',
        sheetEn:
          'Low-poly 3D model reference sheet on a plain pale blue background, isometric camera. Twelve vegetables arranged in a grid of four ' +
          'columns and three rows, each growing on its own small thick square soil bed, evenly spaced, same scale, same light source: ' +
          SHEET_LIST_EN +
          '. Each plant is flowering with its ripe fruit or edible part visible. Flat-shaded polygons, faceted, no textures, no outlines, ' +
          'matte materials, crisp shadows. No text, no labels.',
      },
    },
  ];
})();
