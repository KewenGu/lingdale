import { QuestionType } from './types';

// 作物种类决定题型。种子按题型分三种,不绑定单词;
// 同一种题型在不同季节长成不同的作物,规则完全一样,只是外观和名字不同。

export interface SeedKind {
  questionType: QuestionType;
  label: string;
  seedPrice: number;
  priceMultiplier: number; // 这种作物的售价是基础售价的几倍
  unlockLevel: number; // 玩家到这个等级才能买和种
}

/** 三种种子,从易到难。越难的种子越贵,长出的作物也越值钱。 */
export const SEED_KINDS: SeedKind[] = [
  { questionType: 'choice', label: '看词选义', seedPrice: 4, priceMultiplier: 1, unlockLevel: 1 },
  { questionType: 'reverse', label: '看义选词', seedPrice: 6, priceMultiplier: 1.5, unlockLevel: 4 },
  { questionType: 'spell', label: '拼写', seedPrice: 10, priceMultiplier: 2.5, unlockLevel: 8 },
];

export interface CropType {
  id: string;
  name: string;
  season: number; // 0 到 3,对应 SEASONS
  questionType: QuestionType;
}

/** 每个季节三种作物,依次对应三种题型。 */
export const CROPS: CropType[] = [
  { id: 'turnip', name: '萝卜', season: 0, questionType: 'choice' },
  { id: 'potato', name: '土豆', season: 0, questionType: 'reverse' },
  { id: 'strawberry', name: '草莓', season: 0, questionType: 'spell' },
  { id: 'tomato', name: '番茄', season: 1, questionType: 'choice' },
  { id: 'corn', name: '玉米', season: 1, questionType: 'reverse' },
  { id: 'melon', name: '西瓜', season: 1, questionType: 'spell' },
  { id: 'eggplant', name: '茄子', season: 2, questionType: 'choice' },
  { id: 'pumpkin', name: '南瓜', season: 2, questionType: 'reverse' },
  { id: 'grape', name: '葡萄', season: 2, questionType: 'spell' },
  { id: 'cabbage', name: '白菜', season: 3, questionType: 'choice' },
  { id: 'leek', name: '韭葱', season: 3, questionType: 'reverse' },
  { id: 'snowpea', name: '雪豆', season: 3, questionType: 'spell' },
];

export function seedKind(questionType: QuestionType): SeedKind {
  for (const kind of SEED_KINDS) if (kind.questionType === questionType) return kind;
  throw new Error(`没有这种种子: ${questionType}`);
}

export function cropType(id: string): CropType {
  for (const crop of CROPS) if (crop.id === id) return crop;
  throw new Error(`没有这种作物: ${id}`);
}

/** 某个季节里,某种题型对应的作物。 */
export function seasonCrop(season: number, questionType: QuestionType): CropType {
  for (const crop of CROPS) {
    if (crop.season === season && crop.questionType === questionType) return crop;
  }
  throw new Error(`第 ${season} 季没有 ${questionType} 作物`);
}
