import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  Animal,
  animalType,
  sellGoods,
  GrassSession,
  HAY_PRICE,
  HAY_BUNDLES,
  HUNGRY_DAYS_TO_SICK,
  MEDICINE_PRICE,
  MAX_MASTERY,
  RELAPSE_DAYS,
  SICK_DAYS_TO_DIE,
  SaveData,
  activeProgress,
  animalCondition,
  breed,
  buyLivestock,
  buyMedicine,
  canBreed,
  createSave,
  cureAnimal,
  emptyPlots,
  gameDay,
  gameDayStart,
  getState,
  grassField,
  grassSize,
  grassStatus,
  isGrown,
  livestockSellPrice,
  livestockCost,
  mineStatus,
  mowGrass,
  plant,
  plantCandidate,
  sellHay,
  sellLivestock,
  setAside,
  settlePasture,
  statsBetween,
} from '../core/index';
import { T0, digNext, gameDays, giveSeeds, makeDeck, missWords, noLuck } from './helpers';

// 这个文件里养的都是牛。羊和鸡的规则一样,它们不同的地方在 coop.test.ts 里测
const COW = animalType('cow');
const RATION = COW.ration;
const MILK_PRICE = COW.goodPrice;
const LIVESTOCK_COST_BASE = COW.costBase;
const LIVESTOCK_COST_STEP = COW.costStep;
const CALF_SELL_PRICE = COW.youngSellPrice;
const COW_SELL_PRICE = COW.grownSellPrice;
const COW_GROWTH_DAYS = COW.growthDays;
// 怀小牛要吃饱的天数,和小牛长大用的是同一个数
const GESTATION_DAYS = COW.growthDays;
const CALF_RATION = COW.youngRation;

function setup(deckSize = 100) {
  const deck = makeDeck(deckSize);
  const save = createSave(deck.id, T0, 0);
  return { deck, save };
}

const state = (save: SaveData, id: string) => getState(activeProgress(save), id)!;
const dayStart = (n: number) => gameDayStart(gameDay(T0, 0) + n, 0);
// 在矿里答对的新词休息 3 天,之后才到期
const LATER = T0 + gameDays(6);

// ---------- 草地 ----------

test('草地:有几个旧词到期,就有几株草可割;先割最早到期的', () => {
  const { deck, save } = setup();
  const nothing = grassStatus(save, deck, T0);
  assert.deepEqual(
    [nothing.open, nothing.open ? '' : nothing.reason, nothing.due],
    [false, 'nothing_due', 0],
  );

  const first = digNext(save, deck, true, T0).cardId;
  digNext(save, deck, true, T0 + gameDays(1));
  assert.equal(grassStatus(save, deck, T0 + gameDays(1)).open, false, '还在休息,没到期');

  const status = grassStatus(save, deck, T0 + gameDays(8));
  assert.ok(status.open);
  assert.deepEqual([status.cardId, status.mastery, status.due], [first, 1, 2]);
});

test('割草答对:收一捆牧草进草垛,这个词照常升级去休息', () => {
  const { deck, save } = setup();
  const word = digNext(save, deck, true, T0).cardId;
  const xp = save.xp;
  const result = mowGrass(save, deck, word, true, LATER);
  assert.deepEqual(
    [result.correct, result.masteryBefore, result.masteryAfter, result.hay, result.bagged],
    [true, 1, 2, 1, false],
  );
  assert.equal(save.hay, 1);
  assert.equal(result.xp, 2);
  assert.equal(save.xp, xp + 2);
  assert.equal(state(save, word).dueAt, gameDayStart(gameDay(LATER, 0) + 14, 0)); // 休息 7 天
  assert.equal(emptyPlots(save), 30, '牧草不占种作物的地');
  assert.equal(grassStatus(save, deck, LATER).open, false);
});

test('在牧场复习和在矿里复习,这个词的结果一样', () => {
  const a = setup();
  const b = setup();
  const word = digNext(a.save, a.deck, true, T0).cardId;
  digNext(b.save, b.deck, true, T0);
  const grass = mowGrass(a.save, a.deck, word, true, LATER);
  const ore = digNext(b.save, b.deck, true, LATER).result;
  assert.deepEqual([grass.masteryAfter, grass.xp], [ore.masteryAfter, ore.xp]);
  assert.deepEqual(state(a.save, word), state(b.save, word));
});

test('记得越久的词草越高:一株割下 1、2、3 捆,看答对后的掌握度,不掷骰子', () => {
  assert.deepEqual(HAY_BUNDLES, [0, 1, 1, 2, 2, 3, 3, 3]);
  const { deck, save } = setup(1);
  let now = T0;
  digNext(save, deck, true, now); // 掌握度 1
  const got: number[] = [];
  for (let mastery = 2; mastery <= MAX_MASTERY; mastery++) {
    now = state(save, 'w0').dueAt;
    const status = grassStatus(save, deck, now);
    assert.ok(status.open);
    // 割之前就看得出这株草能割几捆
    assert.deepEqual([status.hay, grassSize(mastery - 1)], [HAY_BUNDLES[mastery], HAY_BUNDLES[mastery]]);
    const result = mowGrass(save, deck, 'w0', true, now);
    assert.equal(result.masteryAfter, mastery);
    got.push(result.hay);
  }
  assert.deepEqual(got, [1, 2, 2, 3, 3, 3]);
  assert.equal(save.hay, 14);
});

test('草不和词绑定:草地只分高矮各几株,割的时候才取最早到期的词;点了多高的草就从那么高的词里取', () => {
  const { deck, save } = setup();
  // 三个到期的旧词:w0 掌握度 1(割 1 捆),w1 掌握度 4(割 3 捆),w2 掌握度 2(割 2 捆);w0 最早到期
  for (let i = 0; i < 3; i++) digNext(save, deck, true, T0 + i);
  const cards = activeProgress(save).cards;
  cards.w1.mastery = 4;
  cards.w2.mastery = 2;
  const later = T0 + gameDays(8);
  assert.deepEqual(grassField(save, later), [0, 1, 1, 1]);

  const any = grassStatus(save, deck, later);
  assert.ok(any.open);
  assert.deepEqual([any.cardId, any.hay, any.due], ['w0', 1, 3]);
  const tall = grassStatus(save, deck, later, 3);
  assert.ok(tall.open);
  assert.deepEqual([tall.cardId, tall.hay], ['w1', 3]);

  // 先割高的也行:到期的词都可以割,不必按到期的先后
  assert.equal(mowGrass(save, deck, 'w1', true, later).hay, 3);
  assert.deepEqual(grassField(save, later), [0, 1, 1, 0]);
  assert.equal(grassStatus(save, deck, later, 3).open, false, '没有这么高的草了');
  assert.throws(() => mowGrass(save, deck, 'w1', true, later), /现在不该复习/);

  const session = new GrassSession(save, deck, noLuck);
  const turn = session.current(later, 2)!;
  assert.deepEqual([turn.cardId, turn.hay], ['w2', 2]);
  assert.equal(session.current(later, 1), turn, '已经出了题,答完之前不换');
});

test('割草答错:没有收成,这个词降两级进词袋,要重新种一遍', () => {
  const { deck, save } = setup();
  const word = digNext(save, deck, true, T0).cardId;
  const result = mowGrass(save, deck, word, false, LATER);
  assert.deepEqual([result.correct, result.hay, result.bagged, result.masteryAfter], [false, 0, true, 0]);
  assert.equal(save.hay, 0);
  assert.deepEqual(activeProgress(save).wordBag, [word]);
  const candidate = plantCandidate(save, deck, LATER)!;
  assert.deepEqual([candidate.card.id, candidate.source], [word, 'bag']);
});

test('田种满了照样能割草复习;没到期的词割不了;在牧场复习过的词矿里不再出', () => {
  const { deck, save } = setup();
  save.plots.forEach((plot, i) => (plot.unlocked = i < 1));
  const known = digNext(save, deck, true, T0).cardId;
  const other = digNext(save, deck, true, T0 + gameDays(1)).cardId;
  missWords(save, deck, 1, T0 + gameDays(1));
  giveSeeds(save, 1);
  assert.ok(plant(save, deck, 0, T0 + gameDays(1)).ok);
  assert.equal(emptyPlots(save), 0);

  const later = T0 + gameDays(8);
  const status = grassStatus(save, deck, later);
  assert.ok(status.open);
  assert.deepEqual([status.cardId, status.due], [known, 2]);
  assert.throws(() => mowGrass(save, deck, 'w9', true, later), /现在不该复习/);
  assert.equal(mowGrass(save, deck, known, true, later).masteryAfter, 2);
  // 牧草和矿里的旧矿脉是同一批词:在牧场复习过的,矿里不会再出
  assert.equal(grassStatus(save, deck, later).due, 1);
  const vein = mineStatus(save, deck, later);
  assert.ok(vein.open);
  assert.equal(vein.vein.cardId, other);
});

test('农场见新词、牧场复习:种新词,换掉认识的,隔天割草考一次,之后到期再割', () => {
  const { deck, save } = setup();
  giveSeeds(save, 1);
  // w0 认识,换掉;w1 不认识,种下
  assert.equal(plantCandidate(save, deck, T0)!.card.id, 'w0');
  setAside(save, deck, 'w0', T0);
  const planted = plant(save, deck, 0, T0);
  assert.ok(planted.ok);
  assert.equal(planted.card.id, 'w1');

  // 下个游戏日,放到一边的 w0 长成了草,割掉就是考一次
  const check = grassStatus(save, deck, dayStart(1));
  assert.ok(check.open);
  assert.equal(check.cardId, 'w0');
  const passed = mowGrass(save, deck, 'w0', true, dayStart(1));
  assert.deepEqual([passed.masteryAfter, passed.hay], [1, 1]);

  // 3 天后 w0 到期,草又长出来了
  const again = dayStart(1 + 6);
  assert.equal(grassStatus(save, deck, again).open, true);
  assert.equal(mowGrass(save, deck, 'w0', true, again).masteryAfter, 2);
});

test('割草会话:一题接一题,直到草地上没有草', () => {
  const { deck, save } = setup();
  const words = [digNext(save, deck, true, T0).cardId, digNext(save, deck, true, T0).cardId];
  const session = new GrassSession(save, deck, noLuck);
  assert.equal(session.closed(T0), 'nothing_due');
  assert.equal(session.current(T0), null);

  const first = session.current(LATER)!;
  assert.deepEqual([first.cardId, first.mastery, first.due, first.question.type], [words[0], 1, 2, 'choice']);
  assert.equal(session.current(LATER), first);
  if (first.question.type === 'spell') return;
  assert.equal(session.submit(first.question.correctIndex, LATER).masteryAfter, 2);

  const second = session.current(LATER)!;
  assert.equal(second.cardId, words[1]);
  assert.equal(session.submitCorrect(false, LATER).bagged, true);
  assert.equal(session.closed(LATER), 'nothing_due');
  assert.throws(() => session.submitCorrect(true, LATER));
});

test('割草记进日志,算进正确率统计', () => {
  const { deck, save } = setup();
  const word = digNext(save, deck, true, T0).cardId;
  mowGrass(save, deck, word, true, LATER);
  const logs = activeProgress(save).logs;
  assert.deepEqual(
    [logs[logs.length - 1].place, logs[logs.length - 1].mastery, logs[logs.length - 1].fresh],
    ['grass', 1, false],
  );
  assert.equal(statsBetween(save, LATER, LATER + 1).reviews, 1);
});

// ---------- 牲畜 ----------

/** 一个有金币、草垛里有牧草的存档。 */
function ranch(coins: number, hay: number) {
  const { deck, save } = setup();
  save.coins = coins;
  save.hay = hay;
  return { deck, save };
}

/** 直接放一头牛进牧场,让测试专注在被测的规则上。 */
function addCow(save: SaveData, fields: Partial<Animal> = {}): Animal {
  const cow: Animal = {
    kind: 'cow',
    fedDays: 0,
    hungryDays: 0,
    sickDays: null,
    pregnantDays: null,
    ...fields,
  };
  save.herd.push(cow);
  return cow;
}
const grownCow = (save: SaveData, fields: Partial<Animal> = {}) =>
  addCow(save, { fedDays: COW_GROWTH_DAYS, ...fields });

test('买小牛:越买越贵,钱不够买不了', () => {
  const { save } = ranch(LIVESTOCK_COST_BASE * 2 + LIVESTOCK_COST_STEP - 1, 0);
  assert.equal(livestockCost('cow', 0), LIVESTOCK_COST_BASE);
  assert.equal(buyLivestock(save, T0), true);
  assert.deepEqual([save.herd.length, save.coins], [1, LIVESTOCK_COST_BASE + LIVESTOCK_COST_STEP - 1]);
  assert.deepEqual(save.herd[0], {
    kind: 'cow',
    fedDays: 0,
    hungryDays: 0,
    sickDays: null,
    pregnantDays: null,
  });
  assert.equal(livestockCost('cow', 1), LIVESTOCK_COST_BASE + LIVESTOCK_COST_STEP);
  assert.equal(buyLivestock(save, T0), false);
  assert.equal(save.herd.length, 1);
});

test('小牛吃饱两个季节才长大,长大之前不出奶;小牛吃的是大牛的一半', () => {
  assert.equal(CALF_RATION, RATION / 2);
  const { save } = ranch(1000, CALF_RATION * COW_GROWTH_DAYS + RATION * 3);
  buyLivestock(save, T0);
  assert.deepEqual(
    settlePasture(save, T0),
    { milk: 0, wool: 0, eggs: 0, born: 0, fellSick: 0, died: 0 },
    '今天刚买,还没到吃草的时候',
  );

  settlePasture(save, dayStart(COW_GROWTH_DAYS - 1));
  assert.deepEqual(
    [save.herd[0].fedDays, isGrown(save.herd[0]), save.goods.milk],
    [COW_GROWTH_DAYS - 1, false, 0],
  );

  settlePasture(save, dayStart(COW_GROWTH_DAYS));
  assert.deepEqual([isGrown(save.herd[0]), save.goods.milk], [true, 0], '长大的那一天还不出奶');
  assert.equal(save.hay, RATION * 3, '两个季节里每天吃一捆半');

  assert.equal(settlePasture(save, dayStart(COW_GROWTH_DAYS + 2)).milk, 2);
  assert.deepEqual([save.goods.milk, save.hay], [2, RATION]);
});

test('长大的牛每个游戏日吃一份口粮,出一份奶;同一个游戏日重复结算没有效果', () => {
  const { save } = ranch(0, RATION * 5);
  grownCow(save);
  grownCow(save);
  assert.equal(settlePasture(save, dayStart(1)).milk, 2);
  assert.deepEqual([save.goods.milk, save.hay], [2, RATION * 3]);
  assert.equal(settlePasture(save, dayStart(1) + 1000).milk, 0);
  assert.deepEqual([save.goods.milk, save.hay], [2, RATION * 3]);
});

test('没吃上草的那天:牛饿着,不出奶,小牛不长', () => {
  const short = CALF_RATION - 1; // 连小牛的一顿都不够
  const { save } = ranch(0, short);
  const cow = grownCow(save);
  const calf = addCow(save, { fedDays: 10 });
  settlePasture(save, dayStart(3));
  assert.deepEqual([save.goods.milk, save.hay], [0, short], '不够一份口粮就不吃,草垛里剩下的不会坏');
  assert.deepEqual([cow.hungryDays, animalCondition(cow)], [3, 'hungry']);
  assert.deepEqual([calf.fedDays, calf.hungryDays], [10, 3]);

  // 吃上一顿就不饿了
  save.hay = RATION * 2;
  settlePasture(save, dayStart(4));
  assert.deepEqual(
    [animalCondition(cow), animalCondition(calf), calf.fedDays, save.goods.milk],
    ['well', 'well', 11, 1],
  );
});

test('草不够所有牛吃:最饿的先吃,轮流挨饿,不会总饿着同一头', () => {
  const { save } = ranch(0, 0);
  const cows = [grownCow(save), grownCow(save), grownCow(save)];
  for (let day = 1; day <= 6; day++) {
    save.hay = RATION; // 每天只够一头吃
    settlePasture(save, dayStart(day));
  }
  assert.equal(save.goods.milk, 6);
  assert.ok(
    cows.every((c) => c.hungryDays <= 2),
    '三头轮着吃,谁都没有连着饿三天',
  );
});

test('玩家几天没来:牛先吃草垛里的存草;吃完了开始挨饿', () => {
  const { save } = ranch(0, RATION * 7);
  const a = grownCow(save);
  const b = grownCow(save);
  // 过了 5 个游戏日,两头牛要吃 10 份,草垛只有 7 份
  assert.deepEqual(settlePasture(save, dayStart(5)), {
    milk: 7,
    wool: 0,
    eggs: 0,
    born: 0,
    fellSick: 0,
    died: 0,
  });
  assert.deepEqual([save.goods.milk, save.hay], [7, 0]);
  assert.deepEqual([a.hungryDays + b.hungryDays, save.herd.length], [3, 2]);
});

test('连着一周没吃上草:牛生病。病着不吃草、不出奶、不长', () => {
  const { save } = ranch(0, 0);
  const cow = grownCow(save);
  assert.equal(settlePasture(save, dayStart(HUNGRY_DAYS_TO_SICK - 1)).fellSick, 0);
  assert.equal(animalCondition(cow), 'hungry');
  assert.equal(settlePasture(save, dayStart(HUNGRY_DAYS_TO_SICK)).fellSick, 1);
  assert.equal(animalCondition(cow), 'sick');

  // 这时候草来了也没用,得先治病
  save.hay = RATION * 10;
  assert.equal(settlePasture(save, dayStart(HUNGRY_DAYS_TO_SICK + 3)).milk, 0);
  assert.deepEqual([save.hay, animalCondition(cow)], [RATION * 10, 'sick']);
});

test('动物药在商店买,用了才治好;药不管饱,治好了还没草吃,一天后又病', () => {
  const { save } = ranch(MEDICINE_PRICE * 2, 0);
  const cow = grownCow(save, { sickDays: 5, hungryDays: HUNGRY_DAYS_TO_SICK });
  assert.equal(cureAnimal(save, 0, T0), false, '手里没药');
  assert.equal(buyMedicine(save), true);
  assert.deepEqual([save.coins, save.medicine], [MEDICINE_PRICE, 1]);
  assert.equal(cureAnimal(save, 0, T0), true);
  assert.deepEqual([animalCondition(cow), save.medicine], ['hungry', 0]);
  assert.equal(cureAnimal(save, 0, T0), false, '没病的不用治');

  assert.equal(settlePasture(save, dayStart(RELAPSE_DAYS - 1)).fellSick, 0);
  assert.equal(settlePasture(save, dayStart(RELAPSE_DAYS)).fellSick, 1);
  assert.deepEqual([animalCondition(cow), cow.sickDays], ['sick', 0]);

  // 这次治好之后有草吃,就真的好了
  buyMedicine(save);
  cureAnimal(save, 0, dayStart(RELAPSE_DAYS));
  save.hay = RATION;
  assert.equal(settlePasture(save, dayStart(RELAPSE_DAYS + 1)).milk, 1);
  assert.equal(animalCondition(cow), 'well');
  assert.equal(buyMedicine(save), false, '钱不够买不了');
});

test('病了半个月还没治:牛死了', () => {
  const { save } = ranch(0, 0);
  grownCow(save, { sickDays: 0, hungryDays: HUNGRY_DAYS_TO_SICK });
  const healthy = grownCow(save);
  save.hay = RATION * SICK_DAYS_TO_DIE;
  assert.equal(settlePasture(save, dayStart(SICK_DAYS_TO_DIE - 1)).died, 0);
  assert.equal(save.herd.length, 2);
  assert.equal(settlePasture(save, dayStart(SICK_DAYS_TO_DIE)).died, 1);
  assert.deepEqual(save.herd, [healthy], '有草吃的那头没事');
});

test('完全不来:一周后牛生病,再过半个月死光;受罚的只是牛,词的进度不变', () => {
  const { deck, save } = setup();
  const word = digNext(save, deck, true, T0).cardId;
  const before = { ...state(save, word) };
  grownCow(save);
  addCow(save);
  const total = HUNGRY_DAYS_TO_SICK + SICK_DAYS_TO_DIE;
  assert.deepEqual(settlePasture(save, dayStart(total - 1)), {
    milk: 0,
    wool: 0,
    eggs: 0,
    born: 0,
    fellSick: 2,
    died: 0,
  });
  assert.deepEqual(settlePasture(save, dayStart(total)), {
    milk: 0,
    wool: 0,
    eggs: 0,
    born: 0,
    fellSick: 0,
    died: 2,
  });
  assert.equal(save.herd.length, 0);
  assert.deepEqual(state(save, word), before);
  assert.equal(grassStatus(save, deck, dayStart(total)).due, 1, '到期的词还在草地上等着');
});

test('长大的牛才能怀小牛;怀上之后吃饱的天数和小牛长大一样多,生下一头,怀着的时候照常出奶', () => {
  const { save } = ranch(0, RATION * (GESTATION_DAYS + 1));
  const cow = grownCow(save);
  assert.equal(canBreed(save, 0), true);
  assert.equal(breed(save, 0, T0), true);
  assert.equal(breed(save, 0, T0), false, '已经怀着了');

  const report = settlePasture(save, dayStart(GESTATION_DAYS));
  assert.deepEqual(report, { milk: GESTATION_DAYS, wool: 0, eggs: 0, born: 1, fellSick: 0, died: 0 });
  assert.equal(save.herd.length, 2);
  assert.deepEqual(save.herd[1], {
    kind: 'cow',
    fedDays: 0,
    hungryDays: 0,
    sickDays: null,
    pregnantDays: null,
  });
  assert.deepEqual([cow.pregnantDays, canBreed(save, 0)], [null, true]);

  // 小牛出生的第二天开始吃草
  settlePasture(save, dayStart(GESTATION_DAYS + 1));
  assert.equal(save.herd[1].hungryDays, 1, '草垛只剩一份,先来的那头吃了');
});

test('没长大的、病着的牛不能怀小牛', () => {
  const { save } = ranch(0, 0);
  addCow(save, { fedDays: COW_GROWTH_DAYS - 1 });
  grownCow(save, { sickDays: 0 });
  assert.deepEqual([breed(save, 0, T0), breed(save, 1, T0), breed(save, 2, T0)], [false, false, false]);
});

test('没吃上草的日子,肚子里的小牛也不长', () => {
  const { save } = ranch(0, 0);
  const cow = grownCow(save, { pregnantDays: 5 });
  settlePasture(save, dayStart(3));
  assert.equal(cow.pregnantDays, 5);
});

test('可以卖牛:养几头由玩家自己定。小牛、大牛各有价,都比买价低;病着的卖不出钱,只能送走', () => {
  const { save } = ranch(0, 0);
  addCow(save);
  const grown = grownCow(save);
  const sick = grownCow(save, { sickDays: 3, hungryDays: HUNGRY_DAYS_TO_SICK });
  assert.deepEqual(save.herd.map(livestockSellPrice), [CALF_SELL_PRICE, COW_SELL_PRICE, 0]);
  assert.ok(CALF_SELL_PRICE < LIVESTOCK_COST_BASE, '买来再卖是亏的');

  assert.equal(sellLivestock(save, 0, T0), CALF_SELL_PRICE);
  assert.deepEqual(save.herd, [grown, sick]);
  assert.equal(sellLivestock(save, 1, T0), 0);
  assert.equal(sellLivestock(save, 0, T0), COW_SELL_PRICE);
  assert.deepEqual([save.herd.length, save.coins], [0, CALF_SELL_PRICE + COW_SELL_PRICE]);
  assert.equal(sellLivestock(save, 0, T0), -1, '没有牛可卖');
});

test('卖掉几头之后,剩下的牛吃得饱了', () => {
  const { save } = ranch(0, 0);
  for (let i = 0; i < 4; i++) grownCow(save);
  save.hay = RATION * 2;
  assert.equal(settlePasture(save, dayStart(1)).milk, 2, '四头牛,草只够两头');
  sellLivestock(save, 3, dayStart(1));
  sellLivestock(save, 2, dayStart(1));
  save.hay = RATION * 2;
  settlePasture(save, dayStart(2));
  assert.ok(save.herd.every((cow) => cow.hungryDays === 0));
});

test('今天割的草,牛明天才吃到', () => {
  const { deck, save } = setup();
  const word = digNext(save, deck, true, T0).cardId;
  save.hay = RATION;
  grownCow(save);
  const result = mowGrass(save, deck, word, true, LATER);
  // 割草之前先结算:从 T0 到 LATER 过了 6 个游戏日,草垛里原有的一份被吃了
  assert.deepEqual([save.goods.milk, save.hay], [1, result.hay]);
});

test('卖牧草和牛奶', () => {
  const { save } = ranch(0, RATION * 2);
  assert.equal(sellHay(save, T0, 2), HAY_PRICE * 2);
  assert.deepEqual([save.coins, save.hay], [HAY_PRICE * 2, RATION * 2 - 2]);
  assert.equal(sellHay(save, T0), HAY_PRICE * (RATION * 2 - 2));
  assert.equal(save.hay, 0);

  save.goods.milk = 3;
  assert.equal(sellGoods(save, 'milk', 1), MILK_PRICE);
  assert.equal(sellGoods(save, 'milk'), MILK_PRICE * 2);
  assert.equal(save.goods.milk, 0);
});

test('卖牧草之前牛先吃:不会把它们今天的口粮卖掉', () => {
  const { save } = ranch(0, RATION * 3);
  grownCow(save);
  assert.equal(sellHay(save, dayStart(1)), HAY_PRICE * RATION * 2);
  assert.deepEqual([save.goods.milk, save.hay], [1, 0]);
});
