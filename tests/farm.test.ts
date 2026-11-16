import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  Deck,
  FREE_SEEDS_PER_DAY,
  Grade,
  INITIAL_PLOTS,
  PRODUCE_PRICES,
  STARTING_SEEDS,
  SaveData,
  activeProgress,
  answer,
  buySeeds,
  claimDailySeeds,
  createSave,
  cropGrowth,
  cropHealth,
  cropQuestionType,
  cropStars,
  cropWaterings,
  dueWords,
  getState,
  masteredCount,
  needsWater,
  nextDueAt,
  nextWaterAt,
  plant,
  plotCost,
  produceCount,
  producePrice,
  seedKind,
  seedOffers,
  seedStockLeft,
  sellAllProduce,
  sellProduce,
  thirstyCards,
  unlockPlot,
} from '../core/index';
import { T0, gameDays, hours, makeDeck } from './helpers';

/** 默认给足种子,让测试专注在被测的规则上。 */
function setup(deckSize = 100, seeds = 20) {
  const deck = makeDeck(deckSize);
  const save = createSave(deck.id, T0, 0);
  save.seeds.choice = seeds;
  return { deck, save };
}

/** 从第 0 块地开始连种 count 株。 */
function plantMany(save: SaveData, deck: Deck, count: number, now: number) {
  for (let i = 0; i < count; i++) assert.ok(plant(save, deck, i, now).ok);
}

/** 按顺序给一个词作答,返回最后一次的结果。测试里不关心浇水间隔,所以用同一个时间。 */
function water(save: SaveData, cardId: string, grades: Grade[], now: number) {
  let last = answer(save, cardId, grades[0], now);
  for (const grade of grades.slice(1)) last = answer(save, cardId, grade, now);
  return last;
}

const FIVE_GOOD: Grade[] = ['good', 'good', 'good', 'good', 'good'];
const state = (save: SaveData, id: string) => getState(activeProgress(save), id)!;

test('播种:种子不绑定单词,没有该复习的词时长成新词', () => {
  const { deck, save } = setup();
  const result = plant(save, deck, 0, T0);
  assert.ok(result.ok);
  assert.deepEqual([result.card.id, result.source, result.mastery, result.xp.xp], ['w0', 'new', 0, 2]);
  assert.equal(save.seeds.choice, 19);
  const crop = save.plots[0].crop!;
  assert.equal(crop.cardId, 'w0');
  assert.deepEqual([crop.cropType, result.cropType, cropQuestionType(crop)], ['turnip', 'turnip', 'choice']); // 春季的基础作物
  assert.deepEqual(cropWaterings(save, crop), { done: 0, needed: 5 });
  assert.deepEqual(
    [cropGrowth(save, crop), cropStars(save, crop), cropHealth(save, crop)],
    [0, 5, 'healthy'],
  );
});

test('播种失败的四种原因', () => {
  const { deck, save } = setup(1, 2);
  assert.deepEqual(plant(save, deck, INITIAL_PLOTS, T0), { ok: false, reason: 'plot_locked' });
  assert.ok(plant(save, deck, 0, T0).ok);
  assert.deepEqual(plant(save, deck, 0, T0), { ok: false, reason: 'plot_occupied' });
  assert.deepEqual(plant(save, deck, 1, T0), { ok: false, reason: 'deck_exhausted' });
  assert.equal(save.seeds.choice, 1); // 没种成不扣种子
  save.seeds.choice = 0;
  assert.deepEqual(plant(save, deck, 1, T0), { ok: false, reason: 'no_seeds' });
});

test('新存档自带种子,每个游戏日可以免费再领一次', () => {
  const save = createSave('test', T0, 0);
  assert.deepEqual(save.seeds, { choice: STARTING_SEEDS, reverse: 0, spell: 0 });
  assert.equal(claimDailySeeds(save, T0), FREE_SEEDS_PER_DAY);
  assert.equal(claimDailySeeds(save, T0 + hours(7)), 0); // 还是同一个游戏日
  assert.equal(claimDailySeeds(save, T0 + hours(8)), FREE_SEEDS_PER_DAY); // 16:00 换日
  assert.equal(save.seeds.choice, STARTING_SEEDS + 2 * FREE_SEEDS_PER_DAY);
});

test('种子店:要花金币,每个游戏日限量', () => {
  const save = createSave('test', T0, 0);
  assert.equal(seedStockLeft(save, T0), 5); // 30 块地每个游戏日供货 5 颗
  assert.equal(buySeeds(save, T0), false); // 没钱
  save.coins = 100;
  const price = seedKind('choice').seedPrice;
  assert.equal(buySeeds(save, T0, 'choice', 6), false); // 超过供货量
  assert.equal(buySeeds(save, T0, 'choice', 3), true);
  assert.deepEqual([save.coins, save.seeds.choice], [100 - 3 * price, STARTING_SEEDS + 3]);
  assert.equal(buySeeds(save, T0, 'choice', 3), false);
  assert.equal(buySeeds(save, T0, 'choice', 2), true);
  assert.equal(buySeeds(save, T0), false); // 卖完了
  assert.equal(seedStockLeft(save, T0 + gameDays(1)), 5);
});

test('每个游戏日只能浇一次水', () => {
  const { deck, save } = setup();
  plantMany(save, deck, 3, T0);
  const crop = save.plots[0].crop!;
  const nextDay = Date.UTC(2026, 0, 1, 16);
  assert.equal(needsWater(save, crop, nextDay - 1), false); // 种下的当天不能浇
  assert.equal(needsWater(save, crop, nextDay), true);
  assert.equal(nextWaterAt(save, crop), nextDay);
  assert.equal(nextDueAt(save, T0), nextDay);
  assert.deepEqual(thirstyCards(save, nextDay), ['w0', 'w1', 'w2']);

  answer(save, 'w1', 'good', nextDay + hours(4)); // 20:00 浇过,要等到第二天 4:00
  assert.deepEqual(thirstyCards(save, nextDay + hours(5)), ['w0', 'w2']);
  assert.equal(needsWater(save, save.plots[1].crop!, Date.UTC(2026, 0, 2, 4) - 1), false);
  assert.equal(needsWater(save, save.plots[1].crop!, Date.UTC(2026, 0, 2, 4)), true);
});

test('新词浇对 5 次水、一次没错:收获五星,掌握度升到 1,卖出后才有金币', () => {
  const { deck, save } = setup();
  plantMany(save, deck, 2, T0);
  const crop = save.plots[0].crop!;
  for (let done = 1; done < 5; done++) {
    const result = answer(save, 'w0', 'good', T0);
    assert.deepEqual([result.harvest, result.stars, result.health], [null, 5, 'healthy']);
    assert.deepEqual(cropWaterings(save, crop), { done, needed: 5 });
    assert.equal(cropGrowth(save, crop), done);
  }
  const last = answer(save, 'w0', 'good', T0);
  assert.deepEqual(last.harvest, { stars: 5, masteryBefore: 0, masteryAfter: 1 });
  assert.equal(last.clearedPlot, 0);
  assert.equal(save.plots[0].crop, null);
  assert.equal(save.plots[1].crop?.cardId, 'w1'); // 旁边的作物不受影响
  assert.equal(produceCount(save, 'turnip', 5), 1);

  assert.equal(save.coins, 0); // 答题和收获本身不给金币
  assert.equal(sellProduce(save, 'turnip', 5), PRODUCE_PRICES[5]);
  assert.deepEqual([save.coins, produceCount(save, 'turnip', 5)], [PRODUCE_PRICES[5], 0]);

  // 这个词休息 3 天后才会再出现
  assert.equal(state(save, 'w0').mastery, 1);
  assert.equal(masteredCount(save), 1);
  assert.deepEqual(dueWords(save, T0 + gameDays(5)), []);
  assert.deepEqual(dueWords(save, T0 + gameDays(6)), ['w0']);
  assert.throws(() => answer(save, 'w0', 'good', T0)); // 不在田里的词不能作答
});

test('答错一次:不生长,扣一星;新词收获四星仍然升级,但卖得便宜', () => {
  const { deck, save } = setup();
  plant(save, deck, 0, T0);
  const crop = save.plots[0].crop!;
  answer(save, 'w0', 'good', T0);
  const miss = answer(save, 'w0', 'again', T0);
  assert.deepEqual([miss.health, miss.stars, miss.died], ['stunted', 4, false]);
  assert.deepEqual(cropWaterings(save, crop), { done: 1, needed: 5 });

  const hit = answer(save, 'w0', 'good', T0);
  assert.deepEqual([hit.health, hit.stars], ['healthy', 4]); // 恢复健康,但星星不会回来

  const last = water(save, 'w0', ['good', 'good', 'good'], T0);
  assert.deepEqual(last.harvest, { stars: 4, masteryBefore: 0, masteryAfter: 1 });
  assert.equal(sellAllProduce(save), PRODUCE_PRICES[4]);
});

test('收获三星以下:照样能卖,但掌握度不升,这个词很快再回来', () => {
  const { deck, save } = setup();
  plant(save, deck, 0, T0);
  const last = water(save, 'w0', ['again', 'hard', 'again', ...FIVE_GOOD], T0);
  assert.deepEqual(last.harvest, { stars: 3, masteryBefore: 0, masteryAfter: 0 });
  assert.equal(sellAllProduce(save), PRODUCE_PRICES[3]);
  assert.equal(masteredCount(save), 0);
  assert.deepEqual(dueWords(save, T0 + gameDays(1)), ['w0']); // 下个游戏日就该再种

  // 再种时种的是它,而不是新词
  const again = plant(save, deck, 0, T0 + gameDays(1));
  assert.ok(again.ok);
  assert.deepEqual([again.card.id, again.source, again.xp.xp], ['w0', 'review', 0]);
  assert.equal(cropStars(save, save.plots[0].crop!), 5); // 品质重新按五星算
  assert.equal(state(save, 'w0').lapses, 2); // 累计记录还在
});

test('品质最低一星;hard 不生长也不扣星', () => {
  const { deck, save } = setup();
  plant(save, deck, 0, T0);
  const crop = save.plots[0].crop!;
  const hard = answer(save, 'w0', 'hard', T0);
  assert.deepEqual([hard.stars, hard.health], [5, 'healthy']);
  assert.equal(cropWaterings(save, crop).done, 0);
  for (let i = 0; i < 6; i++) water(save, 'w0', ['again', 'again', 'hard'], T0); // 每轮错两次,不连错三次
  assert.equal(cropStars(save, crop), 1);
  assert.equal(water(save, 'w0', FIVE_GOOD, T0).harvest?.stars, 1);
  assert.equal(sellAllProduce(save), PRODUCE_PRICES[1]);
});

test('连续答错两次:作物枯萎,答对后恢复', () => {
  const { deck, save } = setup();
  plantMany(save, deck, 2, T0);
  answer(save, 'w0', 'again', T0);
  answer(save, 'w1', 'again', T0); // 别的作物答错互不影响
  const second = answer(save, 'w0', 'again', T0);
  assert.deepEqual([second.health, second.died, second.stars], ['wilted', false, 3]);
  assert.equal(cropHealth(save, save.plots[1].crop!), 'stunted');
  assert.equal(answer(save, 'w0', 'good', T0).health, 'healthy');
});

test('连续答错三次:作物死亡,种子白费,什么都收不到', () => {
  const { deck, save } = setup();
  plantMany(save, deck, 2, T0);
  const seeds = save.seeds.choice;
  const fatal = water(save, 'w0', ['good', 'again', 'again', 'again'], T0);
  assert.deepEqual([fatal.died, fatal.harvest, fatal.clearedPlot, fatal.health], [true, null, 0, null]);
  assert.equal(save.plots[0].crop, null);
  assert.deepEqual(save.produce, {});
  assert.equal(save.seeds.choice, seeds); // 种子不退
  assert.equal(nextDueAt(save, T0), nextWaterAt(save, save.plots[1].crop!)); // 提醒只看还在田里的

  // 这个词下个游戏日回来,要再花一颗种子从头种
  assert.deepEqual(dueWords(save, T0 + gameDays(1)), ['w0']);
  const result = plant(save, deck, 0, T0 + gameDays(1));
  assert.ok(result.ok);
  assert.deepEqual([result.card.id, result.source, save.seeds.choice], ['w0', 'review', seeds - 1]);
});

test('旧词回来时长得快:掌握度 1 浇 3 次,2 浇 2 次,3 以上浇 1 次', () => {
  const { deck, save } = setup();
  plant(save, deck, 0, T0);
  water(save, 'w0', FIVE_GOOD, T0);

  let now = T0;
  const expected = [
    { mastery: 1, needed: 3, restDays: 3 },
    { mastery: 2, needed: 2, restDays: 7 },
    { mastery: 3, needed: 1, restDays: 15 },
    { mastery: 4, needed: 1, restDays: 30 },
  ];
  for (const step of expected) {
    now += gameDays(step.restDays * 2);
    assert.deepEqual(dueWords(save, now - gameDays(1)), []);
    const result = plant(save, deck, 0, now);
    assert.ok(result.ok);
    assert.deepEqual([result.card.id, result.source, result.mastery], ['w0', 'review', step.mastery]);
    const crop = save.plots[0].crop!;
    assert.deepEqual(cropWaterings(save, crop), { done: 0, needed: step.needed });
    const grades: Grade[] = [];
    for (let i = 0; i < step.needed; i++) grades.push('good');
    const last = water(save, 'w0', grades, now);
    assert.deepEqual(last.harvest, { stars: 5, masteryBefore: step.mastery, masteryAfter: step.mastery + 1 });
  }
  // 这个过程跨了好几个季节,收获的是不同季节的作物,所以按全部种类合计
  const fiveStars = Object.keys(save.produce).reduce((sum, id) => sum + produceCount(save, id, 5), 0);
  assert.equal(fiveStars, 5);
  assert.ok(Object.keys(save.produce).length > 1);
  assert.equal(masteredCount(save, 4), 1);
});

test('旧词的四星不升级,三星以下降级,死亡降两级', () => {
  const { deck, save } = setup();
  plantMany(save, deck, 3, T0);
  for (const id of ['w0', 'w1', 'w2']) {
    water(save, id, FIVE_GOOD, T0);
    activeProgress(save).cards[id].mastery = 3; // 直接设成熟词
  }
  const later = T0 + gameDays(100);
  plantMany(save, deck, 3, later);
  assert.equal(water(save, 'w0', ['again', 'good'], later).harvest?.masteryAfter, 3);
  assert.equal(water(save, 'w1', ['again', 'hard', 'again', 'good'], later).harvest?.masteryAfter, 2);
  assert.equal(water(save, 'w2', ['again', 'again', 'again'], later).died, true);
  assert.equal(state(save, 'w2').mastery, 1);
});

test('播种时该复习的词优先于新词,最早到期的先种', () => {
  const { deck, save } = setup();
  plantMany(save, deck, 3, T0);
  water(save, 'w1', ['again', 'again', 'again'], T0); // 下个游戏日回来
  water(save, 'w0', FIVE_GOOD, T0); // 3 天后回来
  const later = T0 + gameDays(6);
  const order = [0, 1, 3].map((i) => {
    const result = plant(save, deck, i, later);
    assert.ok(result.ok);
    return `${result.card.id}:${result.source}`;
  });
  assert.deepEqual(order, ['w1:review', 'w0:review', 'w3:new']);
});

test('作物种类:三种种子对应三种题型,按等级解锁,越难越贵也越值钱', () => {
  const { deck, save } = setup();
  const offers = seedOffers(save, T0);
  assert.deepEqual(
    offers.map((o) => `${o.cropName}:${o.kind.questionType}:${o.unlocked}`),
    ['萝卜:choice:true', '土豆:reverse:false', '草莓:spell:false'],
  );
  save.seeds.spell = 1;
  assert.deepEqual(plant(save, deck, 0, T0, 'spell'), { ok: false, reason: 'crop_locked' });
  save.coins = 1000;
  assert.equal(buySeeds(save, T0, 'reverse'), false); // 等级不够,买不了

  save.xp = 10000; // 升到足够高的等级
  assert.deepEqual(
    seedOffers(save, T0).map((o) => o.unlocked),
    [true, true, true],
  );
  assert.equal(buySeeds(save, T0, 'reverse', 2), true);
  assert.equal(save.coins, 1000 - 2 * seedKind('reverse').seedPrice);
  assert.deepEqual(plant(save, deck, 5, T0, 'reverse').ok, true);
  assert.equal(save.seeds.reverse, 1);

  const spell = plant(save, deck, 0, T0, 'spell');
  assert.ok(spell.ok);
  assert.equal(spell.cropType, 'strawberry');
  assert.equal(cropQuestionType(save.plots[0].crop!), 'spell');
  assert.equal(save.seeds.spell, 0);
  assert.deepEqual(plant(save, deck, 1, T0, 'spell'), { ok: false, reason: 'no_seeds' });

  // 同样是五星,拼写作物卖得更贵
  water(save, spell.card.id, FIVE_GOOD, T0);
  assert.equal(producePrice('strawberry', 5), PRODUCE_PRICES[5] * seedKind('spell').priceMultiplier);
  assert.equal(sellAllProduce(save), producePrice('strawberry', 5));
  assert.ok(producePrice('strawberry', 5) > producePrice('potato', 5));
  assert.ok(producePrice('potato', 5) > producePrice('turnip', 5));
});

test('季节:每季有自己的作物,规则不变;换季前种下的作物照常生长', () => {
  const { deck, save } = setup();
  plant(save, deck, 0, T0);
  const summer = T0 + gameDays(28);
  assert.deepEqual(
    seedOffers(save, summer).map((o) => o.cropName),
    ['番茄', '玉米', '西瓜'],
  );
  const result = plant(save, deck, 1, summer); // 春天剩下的种子到夏天长成夏季作物
  assert.ok(result.ok);
  assert.equal(result.cropType, 'tomato');
  assert.deepEqual(cropWaterings(save, save.plots[1].crop!), { done: 0, needed: 5 });

  assert.equal(save.plots[0].crop?.cropType, 'turnip'); // 春天种的萝卜还在
  assert.deepEqual(water(save, 'w0', FIVE_GOOD, summer).harvest?.stars, 5);
  assert.equal(produceCount(save, 'turnip', 5), 1);
});

test('卖作物:可以按种类和星级卖一部分,也可以全卖', () => {
  const save = createSave('test', T0, 0);
  save.produce = { turnip: [0, 2, 0, 1, 3, 4], strawberry: [0, 0, 0, 0, 0, 2] };
  assert.equal(sellProduce(save, 'turnip', 5, 1), PRODUCE_PRICES[5]);
  assert.equal(sellProduce(save, 'turnip', 2), 0); // 没有二星的
  assert.equal(sellProduce(save, 'potato', 5), 0); // 没有这种作物
  assert.equal(sellProduce(save, 'turnip', 4, 99), 3 * PRODUCE_PRICES[4]); // 最多卖完
  const rest =
    2 * PRODUCE_PRICES[1] + PRODUCE_PRICES[3] + 3 * PRODUCE_PRICES[5] + 2 * producePrice('strawberry', 5);
  assert.equal(sellAllProduce(save), rest);
  assert.equal(sellAllProduce(save), 0);
  assert.equal(save.coins, PRODUCE_PRICES[5] + 3 * PRODUCE_PRICES[4] + rest);
});

test('单词撞上对象原型属性名时也能正常工作', () => {
  const deck = makeDeck(5);
  deck.cards[0].id = 'constructor';
  deck.cards[1].id = 'toString';
  const save = createSave(deck.id, T0, 0);
  assert.equal(getState(activeProgress(save), 'constructor'), undefined);
  plantMany(save, deck, 2, T0);
  assert.equal(answer(save, 'constructor', 'good', T0).stars, 5);
  assert.equal(answer(save, 'toString', 'again', T0).health, 'stunted');
});

test('没学过的词不能作答', () => {
  const { save } = setup();
  assert.throws(() => answer(save, 'w0', 'good', T0));
});

test('解锁地块:金币不够失败,够了扣费,越往后越贵', () => {
  const { save } = setup();
  assert.equal(unlockPlot(save, INITIAL_PLOTS), false);
  assert.equal(unlockPlot(save, 0), false); // 已解锁
  save.coins = 100;
  assert.equal(plotCost(INITIAL_PLOTS), 40);
  assert.equal(unlockPlot(save, INITIAL_PLOTS), true);
  assert.equal(save.coins, 60);
  assert.equal(plotCost(INITIAL_PLOTS + 1), 42);
  for (let i = 1; i <= 6; i++) save.plots[INITIAL_PLOTS + i].unlocked = true;
  assert.equal(seedStockLeft(save, T0), 7); // 37 块地,每个游戏日供货 7 颗
});
