// 农场、牧场、商店三页不在答题时的样子:现在有什么、能做什么。
// 只把核心层算出来的东西摆出来,按钮按下去调核心层的函数。规则一条都不在这里。

import {
  ANIMAL_TYPES,
  Animal,
  AnimalGood,
  Card,
  DEATH_STREAK,
  Deck,
  FEED_BUY_PRICE,
  FEED_PRICE,
  HAY_BUY_PRICE,
  HAY_PRICE,
  HUNGRY_DAYS_TO_SICK,
  MAX_MASTERY,
  MAX_STARS,
  MEDICINE_PRICE,
  QuestionType,
  RELAPSE_DAYS,
  SICK_DAYS_TO_DIE,
  SaveData,
  WATERINGS_TO_HARVEST,
  activeProgress,
  animalCondition,
  animalType,
  breed,
  buyFeed,
  buyHay,
  buyLivestock,
  buyMedicine,
  buySeeds,
  canBreed,
  cropGrowth,
  cropKind,
  cropHealth,
  cropStars,
  cropType,
  cropWaterings,
  cureAnimal,
  dueVeins,
  emptyPlots,
  feedStatus,
  getCard,
  goodPrice,
  grassField,
  houseCount,
  isGrown,
  livestockCost,
  livestockSellPrice,
  needsWater,
  nextDueAt,
  nextWaterAt,
  orePrice,
  plant,
  plantCandidate,
  plotCost,
  produceCount,
  producePrice,
  produceTotal,
  rationOf,
  seedOffers,
  sellAllOre,
  sellAllProduce,
  sellFeed,
  sellGoods,
  sellHay,
  sellLivestock,
  setAside,
  thirstyCards,
  unlockPlot,
  unlockedCount,
} from '../core/index';
import { FeedRound, GrassRound, Round, WaterRound } from './rounds';
import { Child, button, confirmButton, daysText, h, whenText } from './ui';

export type Tab = 'mine' | 'farm' | 'pasture' | 'shop';

export interface Ctx {
  save: SaveData;
  deck: Deck;
  now(): number;
  /** 做一件会改存档的事:做完存档、重画。返回一句话就显示给玩家。 */
  act(change: () => string | void): void;
  startRound(round: Round): void;
  go(tab: Tab): void;
}

/** 种田这一页自己记的东西:换到第几个候选词、挑了哪种种子、刚种下的是哪个词。不进存档。 */
export interface FarmState {
  skip: number;
  seed: QuestionType | null;
  planted: { card: Card; cropName: string } | null;
}

const GOOD_NAMES: Record<AnimalGood, string> = { milk: '牛奶', wool: '羊毛', eggs: '鸡蛋' };
const GRASS_NAMES = ['', '矮草', '中草', '高草'];

function section(title: string, children: Child[]): HTMLElement {
  return h('section', { class: 'panel' }, [h('h2', {}, [title]), ...children]);
}

function note(text: string): HTMLElement {
  return h('p', { class: 'note' }, [text]);
}

/** 一行:左边是名字和说明,右边是按钮。 */
function line(title: string, detail: string, actions: Child[]): HTMLElement {
  return h('div', { class: 'line' }, [
    h('div', { class: 'line-text' }, [
      h('span', { class: 'line-title' }, [title]),
      detail ? h('span', { class: 'line-detail' }, [detail]) : null,
    ]),
    h('div', { class: 'line-actions' }, actions),
  ]);
}

function wordCard(card: Card, withMeaning: boolean): HTMLElement {
  return h('div', { class: 'answer-card' }, [
    h('div', {}, [h('span', { class: 'w' }, [card.front]), h('span', { class: 'p' }, [card.phonetic || ''])]),
    withMeaning ? h('div', { class: 'm' }, [card.back]) : null,
  ]);
}

// ---------- 农场 ----------

function firstEmptyPlot(save: SaveData): number {
  for (let i = 0; i < save.plots.length; i++) {
    if (save.plots[i].unlocked && !save.plots[i].crop) return i;
  }
  return -1;
}

function plantingPart(ctx: Ctx, state: FarmState): Child[] {
  const { save, deck } = ctx;
  const now = ctx.now();
  const parts: Child[] = [];
  if (state.planted) {
    // 种下的这一刻是学这个词的第一步:把卡片完整摆出来
    parts.push(h('p', { class: 'result-line' }, [`种下了,会长成${state.planted.cropName}:`]));
    parts.push(wordCard(state.planted.card, true));
  }
  const plotIndex = firstEmptyPlot(save);
  if (plotIndex < 0) {
    parts.push(note('田满了。等作物收获,或者再开一块地。'));
    return parts;
  }
  const owned = seedOffers(save, now).filter((offer) => offer.owned > 0);
  if (owned.length === 0) {
    parts.push(note(`没有种子。种子在商店买,最便宜的 ${cropKind('choice').seedPrice} 金币一颗。`));
    parts.push(button('去商店', { class: 'btn', id: 'to-shop' }, () => ctx.go('shop')));
    return parts;
  }
  let candidate = plantCandidate(save, deck, now, state.skip);
  if (!candidate && state.skip > 0) {
    // 换到头了,从第一个重新来
    state.skip = 0;
    candidate = plantCandidate(save, deck, now, 0);
  }
  if (!candidate) {
    const due = dueVeins(save, now).length;
    if (due > 0) {
      parts.push(note(`有 ${due} 个旧词该复习了。先去牧场割草或去矿洞把它们复习完,田里才给新词。`));
      parts.push(
        h('div', { class: 'line-actions' }, [
          button('去牧场割草', { class: 'btn', id: 'to-pasture' }, () => ctx.go('pasture')),
          button('去矿洞', { class: 'btn btn-plain', id: 'to-mine' }, () => ctx.go('mine')),
        ]),
      );
    } else {
      parts.push(note('这个词库的词都见过了,词袋里也没有要种的词。'));
    }
    return parts;
  }
  const seed = owned.filter((offer) => offer.kind.questionType === state.seed)[0] || owned[0];
  const card = candidate.card;
  const fromBag = candidate.source === 'bag';
  parts.push(
    h('div', { class: 'vein' }, [
      h('span', { class: fromBag ? 'tag tag-drill' : 'tag tag-new' }, [
        fromBag ? `答错过的词 · 掌握度 ${candidate.mastery}` : '没见过的新词',
      ]),
      h('span', {}, ['这颗种子带这个词']),
    ]),
  );
  // 先只给单词:释义摆出来再问认不认识,谁都会说认识
  parts.push(wordCard(card, false));
  if (owned.length > 1) {
    const picker = h('div', { class: 'seg', role: 'group', 'aria-label': '用哪种种子' });
    for (const offer of owned) {
      const chosen = offer.kind.questionType === seed.kind.questionType;
      picker.appendChild(
        button(
          `${offer.cropName} ×${offer.owned}`,
          { 'aria-pressed': String(chosen), id: `seed-${offer.kind.questionType}` },
          () =>
            ctx.act(() => {
              state.seed = offer.kind.questionType;
            }),
        ),
      );
    }
    parts.push(picker);
  }
  parts.push(note(`用${seed.cropName}种子(${seed.kind.label}),还有 ${seed.owned} 颗。`));
  const plantButton = button('种下', { class: 'btn', id: 'plant' }, () =>
    ctx.act(() => {
      const result = plant(save, deck, plotIndex, ctx.now(), {
        cardId: card.id,
        questionType: seed.kind.questionType,
      });
      if (!result.ok) return `没种成(${result.reason})。`;
      state.planted = { card: result.card, cropName: cropType(result.cropType).name };
      state.skip = 0;
    }),
  );
  const swapButton = fromBag
    ? button('换一个', { class: 'btn btn-plain', id: 'swap' }, () =>
        ctx.act(() => {
          state.skip++;
          state.planted = null;
        }),
      )
    : button('我认识,明天考我', { class: 'btn btn-plain', id: 'swap' }, () =>
        ctx.act(() => {
          state.planted = null;
          if (!setAside(save, deck, card.id, ctx.now())) return '这个词现在放不到一边。';
          return `${card.front} 放到一边了,下个游戏日矿里和草地上会考你一次。`;
        }),
      );
  parts.push(h('div', { class: 'line-actions' }, [plantButton, swapButton]));
  return parts;
}

export function farmView(ctx: Ctx, state: FarmState): Child[] {
  const { save, deck } = ctx;
  const now = ctx.now();
  const thirsty = thirstyCards(save, now);
  const crops = save.plots.filter((plot) => plot.crop).map((plot) => plot.crop!);

  const watering: Child[] = [
    button(`浇一轮水(${thirsty.length} 株)`, { class: 'btn', id: 'water' }, () =>
      ctx.startRound(new WaterRound(save, deck, thirstyCards(save, ctx.now()))),
    ),
  ];
  (watering[0] as HTMLButtonElement).disabled = thirsty.length === 0;
  if (thirsty.length === 0) {
    const next = nextDueAt(save, now);
    watering.push(
      note(
        crops.length === 0
          ? '田里还没有作物。'
          : next === null
            ? '现在没有能浇的。'
            : `现在没有能浇的,下一次是${whenText(next, now, save)}。`,
      ),
    );
  } else {
    watering.push(
      note(
        `浇水就是答这株作物的词。浇对 ${WATERINGS_TO_HARVEST} 次收获,答错扣一星,连错 ${DEATH_STREAK} 次作物会死。`,
      ),
    );
  }

  const rows: Child[] = crops
    .slice()
    .sort((a, b) => {
      const ta = needsWater(save, a, now) ? 0 : nextWaterAt(save, a);
      const tb = needsWater(save, b, now) ? 0 : nextWaterAt(save, b);
      return ta - tb;
    })
    .map((crop) => {
      const waterings = cropWaterings(save, crop);
      const health = cropHealth(save, crop);
      const mark = health === 'wilted' ? ' · 枯萎' : health === 'stunted' ? ' · 答错过' : '';
      return h('div', { class: 'item' }, [
        h('span', { class: 'w' }, [getCard(deck, crop.cardId).front]),
        h('span', { class: 'm' }, [
          `${cropType(crop.cropType).name} · 浇了 ${waterings.done}/${waterings.needed} · ${cropStars(save, crop)} 星${mark}`,
        ]),
        h('span', { class: 'd' }, [
          needsWater(save, crop, now) ? '能浇' : whenText(nextWaterAt(save, crop), now, save),
        ]),
      ]);
    });
  // cropGrowth 是画作物长到哪个样子用的;这一页没有画,只用它数一下快收的有几株
  const blooming = crops.filter((crop) => cropGrowth(save, crop) >= 4).length;

  const unlocked = unlockedCount(save);
  const cost = plotCost(unlocked);
  const lockedIndex = save.plots.map((plot) => plot.unlocked).indexOf(false);
  const unlockButton = button(`再开一块地(${cost} 金币)`, { class: 'btn btn-plain', id: 'unlock' }, () =>
    ctx.act(() => (unlockPlot(save, lockedIndex) ? '开了一块新地。' : '金币不够。')),
  );
  unlockButton.disabled = lockedIndex < 0 || save.coins < cost;

  return [
    section('浇水', watering),
    section('种下', plantingPart(ctx, state)),
    section(`田里(${crops.length} 株,空地 ${emptyPlots(save)} 块)`, [
      rows.length > 0
        ? h('div', { class: 'words' }, rows)
        : note('种下一个词,它就在这里长。单词的意思不写在这儿:浇水的时候要考。'),
      blooming > 0 ? note(`有 ${blooming} 株再浇对一次就收获。`) : null,
      line(`一共 ${unlocked} 块地`, '地越多,能同时学的词越多。', [unlockButton]),
    ]),
  ];
}

// ---------- 牧场 ----------

/** 这一处(小屋或鸡舍)没病的牲畜一个游戏日一共吃几份。病着的不吃。 */
function dailyNeed(save: SaveData, house: 'barn' | 'coop'): number {
  let need = 0;
  for (const animal of save.herd) {
    if (animalType(animal.kind).house === house && animal.sickDays === null) need += rationOf(animal);
  }
  return need;
}

function storeText(have: number, need: number, unit: string, housed: number): string {
  if (need === 0) {
    return housed > 0
      ? `${have} ${unit}。牲畜都病着,病着的不吃东西。`
      : `${have} ${unit},现在没有要吃它的牲畜。`;
  }
  const meals = Math.floor(have / need);
  return `${have} ${unit}。一个游戏日(现实 12 小时)吃 ${need} ${unit},够吃 ${meals} 顿${meals > 0 ? `,也就是${daysText(meals)}` : ''}。`;
}

function animalLine(ctx: Ctx, animal: Animal, index: number): HTMLElement {
  const { save } = ctx;
  const type = animalType(animal.kind);
  const grown = isGrown(animal);
  const facts: string[] = [];
  if (!grown) facts.push(`长到 ${animal.fedDays}/${type.growthDays}(吃饱一个游戏日长一天)`);
  const condition = animalCondition(animal);
  if (condition === 'sick') {
    const left = SICK_DAYS_TO_DIE - (animal.sickDays || 0);
    facts.push(`病了,不吃东西也没有产出。再过${daysText(left)}不治会死`);
  } else if (condition === 'hungry') {
    facts.push(
      `饿了${daysText(animal.hungryDays)},再饿${daysText(HUNGRY_DAYS_TO_SICK - animal.hungryDays)}会生病`,
    );
  } else if (grown && animal.pregnantDays === null) {
    const into = (animal.fedDays - type.growthDays) % type.yieldDays;
    facts.push(
      type.yieldDays === 1
        ? `吃饱了每个游戏日出一份${GOOD_NAMES[type.good]}`
        : `${GOOD_NAMES[type.good]}长到 ${into}/${type.yieldDays}`,
    );
  }
  if (animal.pregnantDays !== null) {
    facts.push(
      `${animal.kind === 'chicken' ? '抱窝' : '怀着'} ${animal.pregnantDays}/${type.gestationDays},这期间没有产出`,
    );
  }
  facts.push(`一个游戏日吃 ${rationOf(animal)} ${type.food === 'hay' ? '捆草' : '份饲料'}`);

  const actions: Child[] = [];
  if (condition === 'sick') {
    const cure = button(`用药(手里 ${save.medicine} 份)`, { class: 'btn', id: `cure-${index}` }, () =>
      ctx.act(() =>
        cureAnimal(save, index, ctx.now())
          ? `治好了。药只治病不管饱:还是没东西吃的话,${daysText(RELAPSE_DAYS)}后又会病。`
          : '没治成。',
      ),
    );
    cure.disabled = save.medicine <= 0;
    actions.push(cure);
    if (save.medicine <= 0) {
      actions.push(button('去商店买药', { class: 'btn btn-plain' }, () => ctx.go('shop')));
    }
  }
  if (canBreed(save, index)) {
    actions.push(
      confirmButton(
        animal.kind === 'chicken' ? '让它抱窝' : '让它怀上',
        `确定?${type.gestationDays} 个游戏日没有产出,生下来多一张嘴`,
        { class: 'btn btn-plain', id: `breed-${index}` },
        () => ctx.act(() => (breed(save, index, ctx.now()) ? undefined : '现在不行。')),
      ),
    );
  }
  const price = livestockSellPrice(animal);
  actions.push(
    confirmButton(
      price > 0 ? `卖掉(+${price})` : '送走',
      price > 0 ? `确定卖掉?+${price} 金币` : '确定送走?病着的卖不出钱',
      { class: 'btn btn-plain', id: `sell-animal-${index}` },
      () =>
        ctx.act(() => {
          const earned = sellLivestock(save, index, ctx.now());
          return earned > 0 ? `卖了 ${earned} 金币。` : '送走了。';
        }),
    ),
  );
  return line(`${grown ? '' : '小'}${type.label}`, facts.join(';') + '。', actions);
}

export function pastureView(ctx: Ctx): Child[] {
  const { save, deck } = ctx;
  const now = ctx.now();
  const field = grassField(save, now);
  let total = 0;
  for (const count of field) total += count;

  const mowAll = button(`割草(${total} 株)`, { class: 'btn', id: 'mow' }, () =>
    ctx.startRound(new GrassRound(save, deck)),
  );
  mowAll.disabled = total === 0;
  const sizes: Child[] = [];
  for (let size = field.length - 1; size >= 1; size--) {
    if (field[size] === 0) continue;
    sizes.push(
      button(
        `${GRASS_NAMES[size] || `${size} 捆的草`} ×${field[size]}(一株 ${size} 捆)`,
        { class: 'chip', id: `mow-${size}` },
        () => ctx.startRound(new GrassRound(save, deck, size)),
      ),
    );
  }
  const grass: Child[] = [
    mowAll,
    sizes.length > 1 ? h('div', { class: 'flag-kinds' }, sizes) : null,
    note(
      total === 0
        ? '草地上现在没有草。该复习的旧词才会长成草。'
        : '一株草是一个该复习的旧词,割一株答一道题。记得越久的词长得越高,割下的草越多。它们和矿里的旧矿脉是同一批词。',
    ),
  ];

  const herd: Child[] = save.herd.map((animal, index) => animalLine(ctx, animal, index));
  if (herd.length === 0) {
    herd.push(
      note('还没有牲畜。小牛、小羊、小鸡在商店买。养几只就是每天要复习多少才喂得饱,觉得累了随时可以卖。'),
    );
    herd.push(button('去商店', { class: 'btn btn-plain' }, () => ctx.go('shop')));
  }

  const status = feedStatus(save, deck, now);
  const feedRows: Child[] = [];
  for (const cropId of Object.keys(save.produce)) {
    for (let stars = 1; stars <= MAX_STARS; stars++) {
      const count = produceCount(save, cropId, stars);
      if (count === 0) continue;
      const make = button('做饲料', { class: 'btn btn-plain', id: `feed-${cropId}-${stars}` }, () =>
        ctx.startRound(new FeedRound(save, deck, cropId, stars)),
      );
      make.disabled = !status.open;
      feedRows.push(
        line(
          `${stars} 星${cropType(cropId).name} ×${count}`,
          stars === MAX_STARS
            ? `卖 ${producePrice(cropId, stars)} 金币一份,和一个鸡蛋一个价,拿来喂鸡不划算`
            : `卖 ${producePrice(cropId, stars)} 金币一份`,
          [make],
        ),
      );
    }
  }
  const feedNote = status.open
    ? `做一份答一道到期的旧词(现在有 ${status.due} 个),答对了一份作物变成两份饲料。到期的词是有数的:拿去做饲料,草地上就少一株草。`
    : status.reason === 'no_crops'
      ? '库存里没有作物。收获的作物不卖,留着就能做饲料。'
      : '现在没有到期的旧词,做不了:做饲料考的是该复习的词。';

  const goods = (Object.keys(GOOD_NAMES) as AnimalGood[])
    .filter((good) => save.goods[good] > 0)
    .map((good) => `${GOOD_NAMES[good]} ×${save.goods[good]}`);

  return [
    section('草地', grass),
    section('口粮', [
      line('草垛', storeText(save.hay, dailyNeed(save, 'barn'), '捆', houseCount(save, 'barn')), []),
      line('鸡饲料', storeText(save.feed, dailyNeed(save, 'coop'), '份', houseCount(save, 'coop')), []),
      note('牲畜自己吃,不用喂。不够吃的时候它们轮着挨饿。'),
    ]),
    section(`牲畜(小屋 ${houseCount(save, 'barn')} 只,鸡舍 ${houseCount(save, 'coop')} 只)`, herd),
    section('做鸡饲料', [...feedRows, note(feedNote)]),
    section('产出', [
      goods.length > 0
        ? line(goods.join(','), '在商店卖。', [
            button('去商店', { class: 'btn btn-plain' }, () => ctx.go('shop')),
          ])
        : note('牛奶、羊毛、鸡蛋会出现在这里。'),
    ]),
  ];
}

// ---------- 商店 ----------

export function shopView(ctx: Ctx): Child[] {
  const { save } = ctx;
  const now = ctx.now();

  const seeds: Child[] = seedOffers(save, now).map((offer) => {
    const type = offer.kind.questionType;
    const buy = (count: number) =>
      button(
        `买 ${count} 颗(${offer.kind.seedPrice * count})`,
        { class: 'btn btn-plain', id: `buy-${type}-${count}` },
        () => ctx.act(() => (buySeeds(save, type, count) ? undefined : '金币不够。')),
      );
    const one = buy(1);
    const five = buy(5);
    one.disabled = !offer.unlocked || save.coins < offer.kind.seedPrice;
    five.disabled = !offer.unlocked || save.coins < offer.kind.seedPrice * 5;
    return line(
      `${offer.cropName}种子 ×${offer.owned}`,
      offer.unlocked
        ? `${offer.kind.label},${offer.kind.seedPrice} 金币一颗`
        : `${offer.kind.label},${offer.kind.unlockLevel} 级解锁`,
      [one, five],
    );
  });

  const selling: Child[] = [];
  let oreWorth = 0;
  const oreParts: string[] = [];
  for (let grade = 1; grade <= MAX_MASTERY; grade++) {
    const count = save.ore[grade] || 0;
    if (count === 0) continue;
    oreWorth += count * orePrice(grade);
    oreParts.push(`${grade} 级 ×${count}`);
  }
  if (oreWorth > 0) {
    selling.push(
      line('矿石', oreParts.join(','), [
        button(`全部卖掉(+${oreWorth})`, { class: 'btn', id: 'sell-ore' }, () =>
          ctx.act(() => `卖了 ${sellAllOre(save)} 金币。`),
        ),
      ]),
    );
  }
  let produceWorth = 0;
  for (const cropId of Object.keys(save.produce)) {
    for (let stars = 1; stars <= MAX_STARS; stars++) {
      produceWorth += produceCount(save, cropId, stars) * producePrice(cropId, stars);
    }
  }
  if (produceTotal(save) > 0) {
    selling.push(
      line(`作物 ×${produceTotal(save)}`, '低星的卖不上价,可以留着在牧场做鸡饲料。', [
        confirmButton(
          `全部卖掉(+${produceWorth})`,
          '确定全卖?做饲料就没有作物了',
          { class: 'btn', id: 'sell-produce' },
          () => ctx.act(() => `卖了 ${sellAllProduce(save)} 金币。`),
        ),
      ]),
    );
  }
  for (const good of Object.keys(GOOD_NAMES) as AnimalGood[]) {
    const count = save.goods[good];
    if (count === 0) continue;
    selling.push(
      line(`${GOOD_NAMES[good]} ×${count}`, `${goodPrice(good)} 金币一份`, [
        button(`全部卖掉(+${count * goodPrice(good)})`, { class: 'btn', id: `sell-${good}` }, () =>
          ctx.act(() => `卖了 ${sellGoods(save, good)} 金币。`),
        ),
      ]),
    );
  }
  if (save.hay > 0) {
    selling.push(
      line(`牧草 ×${save.hay}`, `${HAY_PRICE} 金币一捆。卖之前牛羊会先吃今天的,但不会替以后的日子留。`, [
        confirmButton(
          `全部卖掉(+${save.hay * HAY_PRICE})`,
          houseCount(save, 'barn') > 0 ? '确定?牛羊明天就没草吃了' : '确定全卖?',
          { class: 'btn btn-plain', id: 'sell-hay' },
          () => ctx.act(() => `卖了 ${sellHay(save, ctx.now())} 金币。`),
        ),
      ]),
    );
  }
  if (save.feed > 0) {
    selling.push(
      line(`鸡饲料 ×${save.feed}`, `${FEED_PRICE} 金币一份。`, [
        confirmButton(
          `全部卖掉(+${save.feed * FEED_PRICE})`,
          houseCount(save, 'coop') > 0 ? '确定?鸡明天就没饲料吃了' : '确定全卖?',
          { class: 'btn btn-plain', id: 'sell-feed' },
          () => ctx.act(() => `卖了 ${sellFeed(save, ctx.now())} 金币。`),
        ),
      ]),
    );
  }
  if (selling.length === 0)
    selling.push(note('现在没有东西可卖。矿石、作物、牧草、饲料、牛奶、羊毛、鸡蛋都在这里卖。'));

  const animals: Child[] = ANIMAL_TYPES.map((type) => {
    const cost = livestockCost(type.kind, houseCount(save, type.house));
    const buy = button(`买一只(${cost})`, { class: 'btn btn-plain', id: `buy-${type.kind}` }, () =>
      ctx.act(() =>
        buyLivestock(save, ctx.now(), type.kind)
          ? `买了一只小${type.label}。它从下一个游戏日开始吃东西。`
          : '金币不够。',
      ),
    );
    buy.disabled = save.coins < cost;
    return line(
      `小${type.label}`,
      `小的一个游戏日吃 ${type.youngRation} ${type.food === 'hay' ? '捆草' : '份饲料'},长大了吃 ${type.ration};` +
        `吃饱${daysText(type.growthDays)}长大,之后出${GOOD_NAMES[type.good]}(${type.goodPrice} 金币)。`,
      [buy],
    );
  });
  const medicine = button(`买一份(${MEDICINE_PRICE})`, { class: 'btn btn-plain', id: 'buy-medicine' }, () =>
    ctx.act(() => (buyMedicine(save) ? undefined : '金币不够。')),
  );
  medicine.disabled = save.coins < MEDICINE_PRICE;
  const hay = button(`买 10 捆(${HAY_BUY_PRICE * 10})`, { class: 'btn btn-plain', id: 'buy-hay' }, () =>
    ctx.act(() => (buyHay(save, 10) ? undefined : '金币不够。')),
  );
  hay.disabled = save.coins < HAY_BUY_PRICE * 10;
  const feed = button(`买 10 份(${FEED_BUY_PRICE * 10})`, { class: 'btn btn-plain', id: 'buy-feed' }, () =>
    ctx.act(() => (buyFeed(save, 10) ? undefined : '金币不够。')),
  );
  feed.disabled = save.coins < FEED_BUY_PRICE * 10;

  const bag = activeProgress(save).wordBag.length;
  return [
    section('种子', [
      ...seeds,
      note(`种子决定作物的品种和浇水时的题型,不决定种的是哪个词。词袋里现在有 ${bag} 个答错过的词等着种。`),
    ]),
    section('卖', selling),
    section('牲畜', [
      ...animals,
      note(
        `养牲畜要靠复习喂:牛羊吃割下的牧草,鸡吃作物做的饲料。没东西吃会饿,连着饿${daysText(HUNGRY_DAYS_TO_SICK)}生病,病了${daysText(SICK_DAYS_TO_DIE)}不治会死。`,
      ),
    ]),
    section('救急', [
      line(`动物药 ×${save.medicine}`, '治病,不管饱。', [medicine]),
      line('牧草', `${HAY_BUY_PRICE} 金币一捆(卖只有 ${HAY_PRICE})。`, [hay]),
      line('鸡饲料', `${FEED_BUY_PRICE} 金币一份(卖只有 ${FEED_PRICE})。`, [feed]),
      note('买草买饲料来喂是亏的,只在牲畜快饿病、或者要离开几天的时候用。'),
    ]),
  ];
}
