import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  ANIMAL_TYPES,
  Animal,
  AnimalKind,
  FEED_PER_CROP,
  FeedSession,
  HUNGRY_DAYS_TO_SICK,
  MEDICINE_PRICE,
  PRODUCE_PRICES,
  SICK_DAYS_TO_DIE,
  SaveData,
  activeProgress,
  animalCondition,
  animalType,
  breed,
  buyLivestock,
  buyMedicine,
  claimReliefSeed,
  createSave,
  cureAnimal,
  feedStatus,
  gameDay,
  gameDayStart,
  getState,
  goodPrice,
  grassStatus,
  houseCount,
  isGrown,
  livestockCost,
  livestockSellPrice,
  makeFeed,
  mineStatus,
  produceCount,
  sellGoods,
  sellLivestock,
  settlePasture,
  statsBetween,
} from '../core/index';
import { T0, digNext, gameDays, makeDeck, missWords, noLuck } from './helpers';

function setup(deckSize = 100) {
  const deck = makeDeck(deckSize);
  const save = createSave(deck.id, T0, 0);
  return { deck, save };
}

const state = (save: SaveData, id: string) => getState(activeProgress(save), id)!;
const dayStart = (n: number) => gameDayStart(gameDay(T0, 0) + n, 0);
// 在矿里答对的新词休息 3 天,之后才到期
const LATER = T0 + gameDays(6);
const NOTHING = { milk: 0, wool: 0, eggs: 0, born: 0, fellSick: 0, died: 0 };

function addAnimal(save: SaveData, kind: AnimalKind, fields: Partial<Animal> = {}): Animal {
  const animal: Animal = { kind, fedDays: 0, hungryDays: 0, sickDays: null, pregnantDays: null, ...fields };
  save.herd.push(animal);
  return animal;
}
const grown = (save: SaveData, kind: AnimalKind, fields: Partial<Animal> = {}) =>
  addAnimal(save, kind, { fedDays: animalType(kind).growthDays, ...fields });

/** 库存里放几份萝卜:下标是星数。 */
function stock(save: SaveData, counts: number[]) {
  save.produce.turnip = counts;
}

const CHICKEN = animalType('chicken');
const SHEEP = animalType('sheep');
const COW = animalType('cow');

// ---------- 做饲料 ----------

test('做饲料要有作物,还要有到期的旧词;考的是最早到期的那个', () => {
  const { deck, save } = setup();
  const none = feedStatus(save, deck, T0);
  assert.deepEqual([none.open, none.open ? '' : none.reason], [false, 'no_crops']);

  stock(save, [0, 2, 0, 0, 0, 1]);
  const noWord = feedStatus(save, deck, T0);
  assert.deepEqual([noWord.open, noWord.open ? '' : noWord.reason, noWord.crops], [false, 'nothing_due', 3]);

  const first = digNext(save, deck, true, T0).cardId;
  digNext(save, deck, true, T0 + 1);
  assert.equal(feedStatus(save, deck, T0 + gameDays(1)).open, false, '还在休息,没到期');
  const status = feedStatus(save, deck, LATER);
  assert.ok(status.open);
  assert.deepEqual([status.cardId, status.mastery, status.crops, status.due], [first, 1, 3, 2]);
});

test('做饲料答对:一份作物变成饲料,这个词照常升级去休息;不看作物几星', () => {
  const { deck, save } = setup();
  const word = digNext(save, deck, true, T0).cardId;
  const other = digNext(save, deck, true, T0 + 1).cardId;
  stock(save, [0, 1, 0, 0, 0, 1]);
  const xp = save.xp;

  const low = makeFeed(save, deck, word, 'turnip', 1, true, LATER);
  assert.deepEqual(
    [low.correct, low.masteryBefore, low.masteryAfter, low.feed, low.bagged],
    [true, 1, 2, FEED_PER_CROP, false],
  );
  assert.equal(save.xp, xp + low.xp);
  assert.deepEqual([save.feed, produceCount(save, 'turnip', 1)], [FEED_PER_CROP, 0]);
  assert.equal(state(save, word).dueAt, gameDayStart(gameDay(LATER, 0) + 14, 0)); // 休息 7 天

  const high = makeFeed(save, deck, other, 'turnip', 5, true, LATER);
  assert.equal(high.feed, FEED_PER_CROP);
  assert.deepEqual([save.feed, produceCount(save, 'turnip', 5)], [FEED_PER_CROP * 2, 0]);
});

test('做饲料答错:没做成,作物留着;这个词降两级进词袋', () => {
  const { deck, save } = setup();
  const word = digNext(save, deck, true, T0).cardId;
  stock(save, [0, 1]);
  const result = makeFeed(save, deck, word, 'turnip', 1, false, LATER);
  assert.deepEqual([result.correct, result.feed, result.bagged, result.masteryAfter], [false, 0, true, 0]);
  assert.deepEqual([save.feed, produceCount(save, 'turnip', 1)], [0, 1]);
  assert.deepEqual(activeProgress(save).wordBag, [word]);
});

test('做饲料是一次真的复习:和矿里、牧场是同一批词,做过了别处就没有了;没到期的词不能拿来做', () => {
  const { deck, save } = setup();
  const word = digNext(save, deck, true, T0).cardId;
  stock(save, [0, 3]);
  assert.throws(() => makeFeed(save, deck, word, 'turnip', 1, true, T0 + gameDays(1)), /现在不该复习/);
  assert.throws(() => makeFeed(save, deck, word, 'turnip', 5, true, LATER), /库存里没有/);

  makeFeed(save, deck, word, 'turnip', 1, true, LATER);
  assert.equal(grassStatus(save, deck, LATER).due, 0);
  const mine = mineStatus(save, deck, LATER);
  assert.ok(mine.open);
  assert.equal(mine.vein.source, 'new');
  // 记进日志,算进正确率
  const stats = statsBetween(save, LATER, LATER + 1);
  assert.deepEqual([stats.reviews, stats.good], [1, 1]);
});

test('做饲料的会话:一题做一份,直到没有作物或没有到期的词', () => {
  const { deck, save } = setup();
  for (let i = 0; i < 3; i++) digNext(save, deck, true, T0 + i);
  stock(save, [0, 2]);
  const session = new FeedSession(save, deck, noLuck);
  assert.equal(session.closed(LATER), null);

  const first = session.current(LATER)!;
  assert.deepEqual([first.cardId, first.crops, first.due], ['w0', 2, 3]);
  assert.equal(session.current(LATER), first);
  if (first.question.type === 'spell') return;
  assert.equal(session.submit(first.question.correctIndex, 'turnip', 1, LATER).feed, FEED_PER_CROP);

  const second = session.current(LATER)!;
  assert.equal(second.cardId, 'w1');
  if (second.question.type === 'spell') return;
  const wrong = (second.question.correctIndex + 1) % second.question.options.length;
  assert.equal(session.submit(wrong, 'turnip', 1, LATER).bagged, true);
  assert.equal(produceCount(save, 'turnip', 1), 1, '答错,作物还在');

  session.submitCorrect(true, 'turnip', 1, LATER);
  assert.deepEqual([session.current(LATER), session.closed(LATER)], [null, 'no_crops']);
  assert.equal(save.feed, FEED_PER_CROP * 2);
});

// ---------- 鸡 ----------

test('鸡住鸡舍,吃饲料不吃草;小鸡 14 个游戏日长大,吃的是蛋鸡的一半;蛋鸡每个游戏日吃两份、下一个蛋', () => {
  assert.deepEqual(
    [CHICKEN.growthDays, CHICKEN.youngRation, CHICKEN.ration, CHICKEN.yieldDays],
    [14, 1, 2, 1],
  );
  const { save } = setup();
  save.hay = 100;
  const chick = addAnimal(save, 'chicken');
  assert.deepEqual(settlePasture(save, dayStart(3)), { ...NOTHING }, '没有饲料,草垛里的草它不吃');
  assert.deepEqual([chick.hungryDays, animalCondition(chick), save.hay], [3, 'hungry', 100]);

  save.feed = CHICKEN.youngRation * CHICKEN.growthDays + CHICKEN.ration * 2;
  settlePasture(save, dayStart(3 + CHICKEN.growthDays));
  assert.deepEqual(
    [isGrown(chick), save.goods.eggs, save.feed],
    [true, 0, CHICKEN.ration * 2],
    '长大之前不下蛋',
  );
  assert.deepEqual(settlePasture(save, dayStart(5 + CHICKEN.growthDays)), { ...NOTHING, eggs: 2 });
  assert.deepEqual([save.goods.eggs, save.feed, save.hay], [2, 0, 100]);
});

test('鸡和牛一样会饿、会病、要用药、会死', () => {
  const { save } = setup();
  save.coins = MEDICINE_PRICE;
  const hen = grown(save, 'chicken');
  assert.equal(settlePasture(save, dayStart(HUNGRY_DAYS_TO_SICK)).fellSick, 1);
  assert.equal(animalCondition(hen), 'sick');
  save.feed = 10;
  assert.equal(settlePasture(save, dayStart(HUNGRY_DAYS_TO_SICK + 2)).eggs, 0, '病着不吃,有饲料也没用');

  buyMedicine(save);
  assert.equal(cureAnimal(save, 0, dayStart(HUNGRY_DAYS_TO_SICK + 2)), true);
  assert.equal(settlePasture(save, dayStart(HUNGRY_DAYS_TO_SICK + 3)).eggs, 1);

  const sick = grown(save, 'chicken', { sickDays: 0, hungryDays: HUNGRY_DAYS_TO_SICK });
  assert.equal(settlePasture(save, dayStart(HUNGRY_DAYS_TO_SICK + 3 + SICK_DAYS_TO_DIE)).died, 1);
  assert.ok(save.herd.indexOf(sick) < 0);
});

test('长大就能抱窝:抱 14 个游戏日孵出一只小鸡;抱窝的时候不下蛋', () => {
  assert.equal(CHICKEN.gestationDays, 14);
  const { save } = setup();
  save.feed = CHICKEN.ration * (CHICKEN.gestationDays + 1);
  const hen = grown(save, 'chicken');
  assert.equal(breed(save, 0, T0), true);
  assert.deepEqual(settlePasture(save, dayStart(CHICKEN.gestationDays)), { ...NOTHING, born: 1 });
  assert.deepEqual(
    save.herd.map((a) => a.kind),
    ['chicken', 'chicken'],
  );
  assert.deepEqual([save.goods.eggs, hen.pregnantDays], [0, null]);
  // 孵完接着下蛋
  assert.equal(settlePasture(save, dayStart(CHICKEN.gestationDays + 1)).eggs, 1);
});

// ---------- 羊 ----------

test('羊和牛一样养,不同的是数值:羊吃得少,羊毛三个游戏日一份', () => {
  const same: (keyof typeof COW)[] = [
    'house',
    'food',
    'growthDays',
    'costBase',
    'costStep',
    'youngSellPrice',
    'grownSellPrice',
  ];
  for (const key of same) assert.equal(SHEEP[key], COW[key], key);
  assert.deepEqual([COW.good, SHEEP.good, CHICKEN.good], ['milk', 'wool', 'eggs']);
  assert.deepEqual([COW.yieldDays, SHEEP.yieldDays], [1, 3]);
  assert.deepEqual([COW.ration, COW.youngRation, SHEEP.ration, SHEEP.youngRation], [6, 3, 4, 2]);
  assert.deepEqual([COW.goodPrice, SHEEP.goodPrice], [40, 100]);

  const { save } = setup();
  const daily = COW.ration + SHEEP.ration;
  save.hay = daily * 6;
  grown(save, 'cow');
  const sheep = grown(save, 'sheep');
  assert.deepEqual(settlePasture(save, dayStart(2)), { ...NOTHING, milk: 2 }, '头两天羊还没有毛可剪');
  assert.deepEqual(settlePasture(save, dayStart(3)), { ...NOTHING, milk: 1, wool: 1 });
  assert.deepEqual(settlePasture(save, dayStart(6)), { ...NOTHING, milk: 3, wool: 1 });

  // 没吃上的日子不算:羊毛的节奏按吃饱的天数走
  assert.equal(settlePasture(save, dayStart(8)).wool, 0);
  save.hay = daily * 3;
  assert.equal(settlePasture(save, dayStart(10)).wool, 0);
  assert.equal(settlePasture(save, dayStart(11)).wool, 1);
  assert.equal(sheep.fedDays, SHEEP.growthDays + 9);
});

test('羊怀一个季节生小羊,怀着的时候不产毛;小羊吃大羊的一半', () => {
  const days = SHEEP.gestationDays;
  assert.deepEqual([days, COW.gestationDays], [28, 28]);
  const { save } = setup();
  save.hay = SHEEP.ration * days + SHEEP.youngRation;
  grown(save, 'sheep');
  breed(save, 0, T0);
  assert.deepEqual(settlePasture(save, dayStart(days)), { ...NOTHING, born: 1 });
  assert.deepEqual([save.herd[1].kind, save.goods.wool], ['sheep', 0]);
  // 剩下的半份口粮够小羊吃,不够大羊吃
  settlePasture(save, dayStart(days + 1));
  assert.deepEqual([save.herd[0].hungryDays, save.herd[1].fedDays, save.hay], [1, 1, 0]);
});

test('牛羊分草垛,鸡分饲料,互不相干;各自里面还是最饿的先吃', () => {
  const { save } = setup();
  const cow = grown(save, 'cow');
  const sheep = grown(save, 'sheep');
  const hen = grown(save, 'chicken');
  for (let day = 1; day <= 6; day++) {
    save.hay = COW.ration; // 草只够牛羊里的一只
    save.feed = CHICKEN.ration;
    settlePasture(save, dayStart(day));
  }
  // 牛和羊各吃上三天:三份牛奶,一份羊毛;鸡天天吃上
  assert.deepEqual([save.goods.milk, save.goods.wool, save.goods.eggs], [3, 1, 6]);
  assert.ok(cow.hungryDays <= 1 && sheep.hungryDays <= 1, '牛和羊轮着吃');
  assert.equal(hen.hungryDays, 0);
});

// ---------- 买卖 ----------

test('买牲畜:小屋和鸡舍各算各的价,越买越贵', () => {
  const { save } = setup();
  save.coins = 10000;
  assert.equal(livestockCost('cow', 0), COW.costBase);
  buyLivestock(save, T0, 'cow');
  // 小屋里已经有一头牛,再买羊按第二只算;鸡舍还是第一只
  assert.equal(livestockCost('sheep', houseCount(save, 'barn')), SHEEP.costBase + SHEEP.costStep);
  buyLivestock(save, T0, 'sheep');
  buyLivestock(save, T0, 'chicken');
  buyLivestock(save, T0, 'chicken');
  assert.deepEqual(
    save.herd.map((a) => a.kind),
    ['cow', 'sheep', 'chicken', 'chicken'],
  );
  assert.deepEqual([houseCount(save, 'barn'), houseCount(save, 'coop')], [2, 2]);
  const spent = COW.costBase + SHEEP.costBase + SHEEP.costStep + CHICKEN.costBase * 2 + CHICKEN.costStep;
  assert.equal(save.coins, 10000 - spent);
  save.coins = CHICKEN.costBase;
  assert.equal(buyLivestock(save, T0, 'chicken'), false, '第三只要贵两档,钱不够');
});

test('牛奶、羊毛、鸡蛋各卖各的价;牲畜卖价低于买价', () => {
  const { save } = setup();
  save.goods = { milk: 2, wool: 3, eggs: 4 };
  assert.equal(sellGoods(save, 'milk', 1), goodPrice('milk'));
  assert.equal(sellGoods(save, 'wool'), goodPrice('wool') * 3);
  assert.equal(sellGoods(save, 'eggs'), goodPrice('eggs') * 4);
  assert.deepEqual(save.goods, { milk: 1, wool: 0, eggs: 0 });
  assert.equal(save.coins, goodPrice('milk') + goodPrice('wool') * 3 + goodPrice('eggs') * 4);

  for (const type of ANIMAL_TYPES) {
    assert.ok(type.youngSellPrice < type.costBase, `${type.label}买来再卖是亏的`);
    assert.equal(goodPrice(type.good), type.goodPrice);
  }
  grown(save, 'chicken');
  addAnimal(save, 'sheep');
  assert.deepEqual(save.herd.map(livestockSellPrice), [CHICKEN.grownSellPrice, SHEEP.youngSellPrice]);
  assert.equal(sellLivestock(save, 0, T0), CHICKEN.grownSellPrice);
});

test('一份作物做两份饲料,蛋鸡一天吃两份,所以一份作物换一个蛋;四星及以下的作物喂鸡划算,五星的打平', () => {
  assert.deepEqual(PRODUCE_PRICES, [0, 1, 5, 10, 20, 30]);
  assert.equal(FEED_PER_CROP, 2);
  assert.equal(CHICKEN.ration / FEED_PER_CROP, 1);
  const egg = goodPrice('eggs');
  assert.equal(egg, PRODUCE_PRICES[5]);
  for (let stars = 1; stars <= 4; stars++) assert.ok(PRODUCE_PRICES[stars] < egg, `${stars} 星`);
});

test('有饲料、羊毛或鸡蛋可卖的时候,商店不送兜底种子', () => {
  const { deck, save } = setup();
  missWords(save, deck, 1, T0);
  assert.equal(claimReliefSeed(save), true);
  save.seeds.choice = 0;
  save.goods.eggs = 1;
  assert.equal(claimReliefSeed(save), false);
  save.goods.eggs = 0;
  save.goods.wool = 1;
  assert.equal(claimReliefSeed(save), false);
});
