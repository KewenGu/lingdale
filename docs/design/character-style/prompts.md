# 人物立绘的生成提示词

给项目负责人自己在图像生成工具里出图用。[对比页](index.html)上的图全是代码画的,它们低估了更写实的画法;
想看那条路的上限,只能真的出几张图来比。

两组提示词,对应建议的那条路(世界保持彩纸,人物另画)里的两档:

- **第一组:线稿加平涂。** 建议的画法。
- **第二组:半写实。** 用来对照:更写实之后好看多少,和彩纸画面还接不接得上。

## 用之前

- **提示词里没有任何作品、角色、画师的名字,也不要加。** 这是项目的规定([美术规范](../07-art-direction.md#不做什么)),也是版权上的底线。
  出图之后自己再看一遍:如果像某个已有作品里的角色,这张不要用。
- **人物要得体。** 都是成年的镇上居民,日常的工作服,没有恋爱向的设定。提示词里已经写了,出图时也照这个标准挑。
- **2026-11-22 已经用其中的写法出过一轮图**(OpenAI 和豆包各一个模型),结果和实际用的完整提示词见 [README](README.md#图像生成模型出的立绘) 和 [`generated/manifest.json`](generated/manifest.json)。
  那一轮每个画面只出了一张,没有调过提示词;换别的工具可能要删减或者拆成几句。
- **那一轮里出过的毛病:** 没让画的胡茬被加上了;痣漏了;有的人物看起来比设定的年纪小;豆包不写死宽高时每张的长宽比都不一样。出图之后逐项对。
- **出的图是 AI 生成内容。** 留下来的每一张都在 [README](README.md#ai-生成素材登记) 里登记工具和日期;放进对比页要标明是 AI 生成的;对外发布时按平台规定声明。
- **从第一张图开始留记录:** 用的工具和版本、完整的提示词、参考图、每一步改了什么。
  以后如果要主张这张图的权利,拿不出创作过程的记录会很被动,依据见 [README](README.md#5-用图像生成模型画人物绕不开的问题)。
- **先读工具当时的用户协议**,确认这一档账号出的图能不能商用。
- 建议画幅 3:4 竖版,背景纯白或透明,方便抠出来贴进彩纸画面。

## 人物设定

四个居民的设定见 [`cast.js`](cast.js)。下面以麦冬为例,换人时只换"人物"这一段。

```text
人物:麦冬,34 岁的男性,小镇种子店的老板。中等个子,肩膀平,站姿放松。
栗色的半长发,在颈后松松地扎成一小束,搭在他左肩上,用一根番茄红的发绳系着;额前的刘海偏分,有一缕垂在两眼之间。
琥珀色的眼睛,眼尾略微下垂,右眼下面有一颗小痣。右耳后面别着一支黄色的铅笔。
穿米白色的衬衫,袖子卷到手肘,外面系一条深绿色的围裙,围裙胸前的口袋里插着三包种子,种子袋是白色的,顶上各有一条红、橙、紫色的色带。
神情温和,有一点慢性子。
```

```text
Character: Maidong, a 34-year-old man who runs the seed shop in a small farming town. Average height, level shoulders, relaxed posture.
Chestnut-brown medium-length hair tied loosely into a short low ponytail that rests over his left shoulder, held by a tomato-red hair tie; side-parted fringe with one loose strand falling between the eyes.
Amber eyes with slightly downturned outer corners, a small mole under his right eye. A yellow pencil tucked behind his right ear.
He wears a cream-white shirt with sleeves rolled to the elbows under a deep green apron; the apron's chest pocket holds three white seed packets, each with a red, orange or purple band across the top.
Gentle, unhurried expression.
```

颜色想和游戏的色板对上,可以把色值写进去:米白 `#fffaf0`,深绿 `#2b7a4d`,番茄红 `#ee5b4b`,玉米黄 `#ffd24a`,橙 `#ff9a3d`,紫 `#7b5cc4`。
不是每个工具都认色值,不认的时候用上面的颜色名。

## 第一组:线稿加平涂

### 基础立绘 · 中文

```text
日系动画风格的角色立绘,半身像,从头顶到腰,正面略微偏向一侧,竖版 3:4,纯白背景。
[把上面"人物"那一段贴在这里]
画法:干净均匀的深褐色线稿,不用纯黑;平涂上色,每种颜色只有一层硬边的暗部,头发上一道高光;没有渐变,没有柔光,没有厚涂的笔触,没有背景,没有文字。
配色限定而明亮:米白、深绿、栗色,少量番茄红和玉米黄做点缀。
人物是成年人,衣着日常得体,气质亲切,像邻居。不要性感化,不要夸张的身材,不要华丽的装饰。
光线均匀,正面柔和的日光。画面里只有这一个人。
```

### 基础立绘 · English

```text
Character illustration in a Japanese animation style, half-body portrait from the top of the head to the waist, facing forward and turned very slightly to one side, portrait 3:4, plain white background.
[paste the "Character" paragraph here]
Rendering: clean, even dark-brown line art instead of pure black; flat cel shading with a single hard-edged shadow tone per color and one highlight band on the hair; no gradients, no soft glow, no painterly brushwork, no background, no text.
Limited bright palette: cream white, deep green, chestnut brown, with small accents of tomato red and corn yellow.
An adult in ordinary, modest everyday clothing, warm and neighborly. Not sexualized, no exaggerated body proportions, no ornate decoration.
Even, soft frontal daylight. Only this one person in the frame.
```

### 表情差分

**做法比提示词重要:不要为每个表情重新生成整张图。** 先选定一张基础立绘,以后每个表情都用工具的"参考图编辑"或"局部重绘"功能,
只圈住脸,只改脸,身体、头发、衣服一个像素都不动。这样换表情之后才是同一个人、同一件衣服。

每次编辑时附上基础立绘,提示词用这个模板:

```text
只修改这张图里人物的脸部表情,其余部分(发型、衣服、身体、线稿的粗细、配色、背景)保持完全不变。还是同一个人:同样的脸型、眼型、瞳色,眼下的痣还在。
新的表情:[从下面选一条]
```

```text
Change only the facial expression of the person in this image. Keep everything else exactly the same: hairstyle, clothing, body, line weight, colors, background. It must remain the same person, with the same face shape, eye shape and eye color, and the mole under the eye.
New expression: [pick one below]
```

| 表情 | 中文 | English |
|---|---|---|
| 高兴 | 开心地笑,眼睛弯成月牙,嘴张开露出上排牙齿,脸颊微红 | a happy laugh, eyes curved shut into crescents, mouth open showing the upper teeth, slightly flushed cheeks |
| 疑惑 | 一边眉毛挑起,头略微歪向一侧,眼睛看向旁边,嘴微微张开 | one eyebrow raised, head tilted slightly, eyes glancing to the side, mouth slightly open |
| 鼓励 | 眉毛上扬,眼睛睁大,带着笑说话,神情笃定 | eyebrows lifted, eyes bright and open, speaking with a confident smile |
| 答错时 | 眉头微微抬起,带一点歉意的苦笑,眼睛半垂,神情温和,不是责备 | inner eyebrows slightly raised, a gentle rueful half-smile, eyes half lowered, kind and not scolding |
| 眨眼 | 双眼自然闭合,其余和基础立绘一样 | both eyes gently closed, otherwise identical to the base image |
| 说话 | 嘴半张,其余和基础立绘一样 | mouth half open as if speaking, otherwise identical to the base image |

### 姿势

姿势比表情难保持一致,因为身体要重画。有两个办法,都要附上基础立绘当参考:

```text
参考图里的这个人物,同样的长相、发型、服装和画法,换一个姿势:[一只手托着下巴,在想事情 / 一只手举起一包种子给人看 / 双手抱在胸前,笑着]。
半身像,竖版 3:4,纯白背景。线稿的粗细和上色方式和参考图一致。
```

```text
The same character as in the reference image, with the same face, hairstyle, clothing and rendering style, in a new pose: [one hand on his chin, thinking / holding up a seed packet to show it / arms folded, smiling].
Half-body portrait, portrait 3:4, plain white background. Match the line weight and coloring of the reference image.
```

出图之后逐项对一遍:发束在哪一边、铅笔在哪只耳朵、痣在哪只眼睛下面、种子袋是不是三包、围裙的颜色。这些地方最容易变。

### 换一个居民

换掉"人物"那一段,并且附上已经定稿的麦冬当**画风参考**(不是人物参考),加一句:

```text
画法、线稿的粗细、上色方式、头身比例和参考图完全一致,像同一位画师画的同一部作品里的另一个人物。人物本身是另一个人,不要沿用参考图里的长相、发型和服装。
```

```text
Match the reference image exactly in rendering style, line weight, coloring method and head-to-body proportions, as if drawn by the same artist for the same production. The character is a different person; do not reuse the face, hairstyle or clothing from the reference.
```

十个居民画风统一,比一个居民换表情更难。先做两个人,放在一起看像不像同一个游戏,再决定要不要做下去。

## 第二组:半写实

人物设定和上面相同,只换画法这一段。表情差分、姿势、换人的做法也相同。

### 基础立绘 · 中文

```text
半写实风格的角色立绘,带有日系插画的气质,半身像,从头顶到腰,正面略微偏向一侧,竖版 3:4,纯白背景。
[把"人物"那一段贴在这里]
画法:柔和细腻的上色,皮肤和头发有自然的明暗过渡,布料有质感;五官比例接近真人但略微理想化;线条很少,形体主要靠明暗;整体完成度高。没有背景,没有文字。
配色:米白、深绿、栗色,少量番茄红和玉米黄做点缀,整体明亮温暖,不要昏暗。
人物是成年人,衣着日常得体,气质亲切。不要性感化,不要夸张的身材,不要华丽的装饰,不要发光的特效。
光线:柔和的正面日光。画面里只有这一个人。
```

### 基础立绘 · English

```text
Semi-realistic character illustration with a Japanese illustration sensibility, half-body portrait from the top of the head to the waist, facing forward and turned very slightly to one side, portrait 3:4, plain white background.
[paste the "Character" paragraph here]
Rendering: soft, refined painting with natural light-to-shadow transitions on skin and hair and visible fabric texture; facial proportions close to a real person but gently idealized; very little line work, forms defined by light and shadow; high level of finish. No background, no text.
Palette: cream white, deep green, chestnut brown, with small accents of tomato red and corn yellow; bright and warm overall, not dim.
An adult in ordinary, modest everyday clothing, warm and approachable. Not sexualized, no exaggerated body proportions, no ornate decoration, no glowing effects.
Soft frontal daylight. Only this one person in the frame.
```

## 出图之后比什么

把出的图和[对比页](index.html)里的彩纸版放在一起,问这几个问题:

1. **好看多少。** 值不值得为它多出一条产线。最好拿给两三个目标用户看,只问"你更想和哪个人说话"。
2. **贴进彩纸画面里像不像一张贴纸。** 把图抠出来,加一圈纸白的边,放到对比页的对话界面上看。平涂的和半写实的各试一张。
3. **换五个表情之后还是不是同一个人。** 逐项对:发束、铅笔、痣、种子袋。记下每个表情重做了几次才能用。
4. **第二个居民和第一个像不像同一个游戏里的人。**
5. **一共花了多少时间。** 从开始到拿到一个居民加五个表情。这个数是"一个人做不做得下来"的依据,现在只有估计。

出的图如果要放进仓库,放在 `generated/` 目录下,并在 README 的登记表里记一行。
