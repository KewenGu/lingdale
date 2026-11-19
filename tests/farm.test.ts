import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  Deck,
  Grade,
  INITIAL_PLOTS,
  PRODUCE_PRICES,
  SaveData,
  activeProgress,
  answer,
  createSave,
  cropGrowth,
  cropHealth,
  cropKind,
  cropOffers,
  cropQuestionType,
  cropStars,
  cropWaterings,
  dueVeins,
  emptyPlots,
  getState,
  masteredCount,
  needsWater,
  nextDueAt,
  nextWaterAt,
  plant,
  plotCost,
  produceCount,
  producePrice,
  sellAllProduce,
  sellProduce,
  thirstyCards,
  unlockPlot,
} from '../core/index';
import { T0, gameDays, hours, makeDeck, seedWords } from './helpers';

function setup(deckSize = 100) {
  const deck = makeDeck(deckSize);
  const save = createSave(deck.id, T0, 0);
  return { deck, save };
}

/** 在矿里答错 count 个词拿到种子,然后从第 0 块地开始依次种下。 */
function plantMany(save: SaveData, deck: Deck, count: number, now: number) {
  seedWords(save, deck, count, now);
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

test('播种:种子是哪个词,长出来的就是哪个词', () => {
  const { deck, save } = setup();
  seedWords(save, deck, 3, T0); // 背包里是 w0、w1、w2
  const first = plant(save, deck, 0, T0);
  assert.ok(first.ok);
  assert.deepEqual([first.card.id, first.mastery, first.xp.xp], ['w0', 0, 2]); // 默认种最早得到的那颗
  const picked = plant(save, deck, 1, T0, { cardId: 'w2' }); // 也可以指定种哪颗
  assert.ok(picked.ok);
  assert.equal(picked.card.id, 'w2');
  assert.deepEqual(activeProgress(save).seedBag, ['w1']);

  const crop = save.plots[0].crop!;
  assert.deepEqual([crop.cardId, crop.cropType, cropQuestionType(crop)], ['w0', 'turnip', 'choice']); // 春季的基础作物
  assert.deepEqual(cropWaterings(save, crop), { done: 0, needed: 5 });
  assert.deepEqual(
    [cropGrowth(save, crop), cropStars(save, crop), cropHealth(save, crop)],
    [0, 5, 'healthy'],
  );
});

test('播种失败的原因', () => {
  const { deck, save } = setup();
  assert.deepEqual(plant(save, deck, 0, T0), { ok: false, reason: 'no_seeds' }); // 种子只能从矿里来
  seedWords(save, deck, 2, T0);
  assert.deepEqual(plant(save, deck, INITIAL_PLOTS, T0), { ok: false, reason: 'plot_locked' });
  assert.deepEqual(plant(save, deck, 0, T0, { cardId: 'w9' }), { ok: false, reason: 'seed_not_found' });
  assert.deepEqual(plant(save, deck, 0, T0, { questionType: 'spell' }), { ok: false, reason: 'crop_locked' });
  assert.ok(plant(save, deck, 0, T0).ok);
  assert.deepEqual(plant(save, deck, 0, T0), { ok: false, reason: 'plot_occupied' });
  assert.deepEqual(activeProgress(save).seedBag, ['w1']); // 没种成的不扣种子
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

test('浇对 5 次水、一次没错:收获五星,掌握度升到 1,3 天后回到矿里', () => {
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

  assert.equal(state(save, 'w0').mastery, 1);
  assert.equal(masteredCount(save), 1);
  assert.deepEqual(dueVeins(save, T0 + gameDays(5)), []);
  assert.deepEqual(dueVeins(save, T0 + gameDays(6)), ['w0']);
  assert.deepEqual(activeProgress(save).seedBag, []); // 学会的词不会再变回种子,除非在矿里又答错
  assert.throws(() => answer(save, 'w0', 'good', T0)); // 不在田里的词不能浇水
});

test('答错一次:不生长,扣一星;掌握度为 0 的词收获四星仍然升级,但卖得便宜', () => {
  const { deck, save } = setup();
  plantMany(save, deck, 1, T0);
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

test('收获三星以下:照样能卖,但掌握度不升,这个词半天后就回到矿里', () => {
  const { deck, save } = setup();
  plantMany(save, deck, 1, T0);
  const last = water(save, 'w0', ['again', 'hard', 'again', ...FIVE_GOOD], T0);
  assert.deepEqual(last.harvest, { stars: 3, masteryBefore: 0, masteryAfter: 0 });
  assert.equal(sellAllProduce(save), PRODUCE_PRICES[3]);
  assert.equal(masteredCount(save), 0);
  assert.deepEqual(dueVeins(save, T0 + gameDays(1)), ['w0']);
});

test('品质最低一星;hard 不生长也不扣星', () => {
  const { deck, save } = setup();
  plantMany(save, deck, 1, T0);
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

test('连续答错三次:作物死亡,种子白费,这个词回到矿里重新来过', () => {
  const { deck, save } = setup();
  plantMany(save, deck, 2, T0);
  const fatal = water(save, 'w0', ['good', 'again', 'again', 'again'], T0);
  assert.deepEqual([fatal.died, fatal.harvest, fatal.clearedPlot, fatal.health], [true, null, 0, null]);
  assert.equal(save.plots[0].crop, null);
  assert.deepEqual(save.produce, {});
  assert.deepEqual(activeProgress(save).seedBag, []); // 种子不退
  assert.equal(emptyPlots(save), INITIAL_PLOTS - 1);
  assert.equal(nextDueAt(save, T0), nextWaterAt(save, save.plots[1].crop!)); // 提醒只看还在田里的

  // 下个游戏日它重新出现在矿里:答对出矿,答错才又变回种子
  assert.deepEqual(dueVeins(save, T0 + gameDays(1)), ['w0']);
});

test('忘掉的旧词种回去:四星不升不降,三星以下再降一级,死亡再降两级', () => {
  const { deck, save } = setup();
  plantMany(save, deck, 3, T0);
  for (const id of ['w0', 'w1', 'w2']) activeProgress(save).cards[id].mastery = 3; // 当作忘掉后降到 3 级的旧词
  assert.equal(water(save, 'w0', ['again', ...FIVE_GOOD], T0).harvest?.masteryAfter, 3);
  assert.equal(water(save, 'w1', ['again', 'hard', 'again', ...FIVE_GOOD], T0).harvest?.masteryAfter, 2);
  assert.equal(water(save, 'w2', ['again', 'again', 'again'], T0).died, true);
  assert.equal(state(save, 'w2').mastery, 1);
});

test('作物种类:播种时选,决定题型;按等级解锁,越难越值钱', () => {
  const { deck, save } = setup();
  seedWords(save, deck, 3, T0);
  assert.deepEqual(
    cropOffers(save, T0).map((o) => `${o.cropName}:${o.kind.questionType}:${o.unlocked}`),
    ['萝卜:choice:true', '土豆:reverse:false', '草莓:spell:false'],
  );
  assert.deepEqual(plant(save, deck, 0, T0, { questionType: 'reverse' }), {
    ok: false,
    reason: 'crop_locked',
  });

  save.xp = 10000; // 升到足够高的等级
  assert.deepEqual(
    cropOffers(save, T0).map((o) => o.unlocked),
    [true, true, true],
  );
  const spell = plant(save, deck, 0, T0, { questionType: 'spell' });
  assert.ok(spell.ok);
  assert.equal(spell.cropType, 'strawberry');
  assert.equal(cropQuestionType(save.plots[0].crop!), 'spell');
  const reverse = plant(save, deck, 1, T0, { questionType: 'reverse' });
  assert.ok(reverse.ok);
  assert.equal(reverse.cropType, 'potato');

  // 同样是五星,拼写作物卖得更贵
  water(save, spell.card.id, FIVE_GOOD, T0);
  assert.equal(producePrice('strawberry', 5), PRODUCE_PRICES[5] * cropKind('spell').priceMultiplier);
  assert.equal(sellAllProduce(save), producePrice('strawberry', 5));
  assert.ok(producePrice('strawberry', 5) > producePrice('potato', 5));
  assert.ok(producePrice('potato', 5) > producePrice('turnip', 5));
});

test('季节:每季有自己的作物,规则不变;换季前种下的作物照常生长', () => {
  const { deck, save } = setup();
  plantMany(save, deck, 1, T0);
  const summer = T0 + gameDays(28);
  assert.deepEqual(
    cropOffers(save, summer).map((o) => o.cropName),
    ['番茄', '玉米', '西瓜'],
  );
  seedWords(save, deck, 1, summer);
  const result = plant(save, deck, 1, summer);
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

test('单词撞上对象原型属性名时也能正常种和浇水', () => {
  const deck = makeDeck(5);
  deck.cards[0].id = 'constructor';
  deck.cards[1].id = 'toString';
  const save = createSave(deck.id, T0, 0);
  assert.equal(getState(activeProgress(save), 'constructor'), undefined);
  plantMany(save, deck, 2, T0);
  assert.equal(answer(save, 'constructor', 'good', T0).stars, 5);
  assert.equal(answer(save, 'toString', 'again', T0).health, 'stunted');
});

test('没学过的词不能浇水', () => {
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
  assert.equal(emptyPlots(save), INITIAL_PLOTS + 1);
});
