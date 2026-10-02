/**
 * 『토끼전』 퀴즈 데이터 — 단어 퀴즈 10개 + 내용 퀴즈 10개.
 * 유형 비율(전체 20문항): OX 3 · 객관식 14 · 주관식 3 (≈ 15/70/15%).
 * TOPIK 4급 수준의 쉬운 문장. (게임용 quiz.ts와는 별개)
 *
 * 객관식 options는 '정답이 항상 0번'으로 작성되어 있으니,
 * 화면에서는 반드시 보기를 섞어서(shuffle) 보여 준다.
 */

export type QuizType = "ox" | "mc" | "sa";
export type QuizCategory = "word" | "content";

export interface QuizQuestion {
  category: QuizCategory;
  type: QuizType;
  q: string;
  options?: string[]; // mc 전용 (0번이 정답)
  answerBool?: boolean; // ox 전용
  answerText?: string[]; // sa 전용 (허용 정답들)
  explain: string;
}

/** 단어 퀴즈 (10): MC 7 · OX 1 · SA 2 */
export const WORD_QUIZ: QuizQuestion[] = [
  {
    category: "word",
    type: "mc",
    q: "'용궁(龍宮)'은 무슨 뜻이에요?",
    options: ["용왕이 사는 바닷속 궁전", "토끼가 사는 집", "하늘에 있는 궁전", "산속 깊은 동굴"],
    explain: "용궁은 용왕이 사는 바닷속 궁전이에요.",
  },
  {
    category: "word",
    type: "mc",
    q: "'별주부'는 누구를 가리켜요?",
    options: ["자라", "토끼", "용왕", "거북이 신하들"],
    explain: "별주부는 자라의 다른 이름이에요.",
  },
  {
    category: "word",
    type: "mc",
    q: "'꾀'와 가장 비슷한 뜻의 말은?",
    options: ["슬기로운 방법", "힘", "노래", "선물"],
    explain: "'꾀'는 문제를 푸는 슬기로운 방법이에요.",
  },
  {
    category: "word",
    type: "mc",
    q: "'벼슬'은 무슨 뜻이에요?",
    options: ["나라의 관직(자리)", "많은 돈", "작은 배", "병을 고치는 약"],
    explain: "'벼슬'은 나라에서 맡는 관직, 즉 자리예요.",
  },
  {
    category: "word",
    type: "mc",
    q: "'육지'의 뜻으로 알맞은 것은?",
    options: ["바다가 아닌 땅", "깊은 바닷속", "하늘", "큰 강"],
    explain: "'육지'는 바다가 아닌 땅이에요.",
  },
  {
    category: "word",
    type: "mc",
    q: "'충성'의 뜻으로 알맞은 것은?",
    options: ["마음을 다해 따르고 섬김", "거짓말을 함", "빨리 달아남", "크게 화를 냄"],
    explain: "'충성'은 마음을 다해 윗사람이나 나라를 따르고 섬기는 것이에요.",
  },
  {
    category: "word",
    type: "mc",
    q: "'속다'의 뜻은 무엇이에요?",
    options: ["거짓말을 참말로 믿다", "빨리 달리다", "병이 낫다", "선물을 주다"],
    explain: "'속다'는 거짓말을 참말로 믿는 것이에요. 용왕이 토끼에게 속았지요.",
  },
  {
    category: "word",
    type: "ox",
    q: "'간(肝)'은 우리 몸속에 있는 장기(기관)이다.",
    answerBool: true,
    explain: "맞아요. '간'은 우리 몸속의 중요한 장기예요.",
  },
  {
    category: "word",
    type: "sa",
    q: "용왕이 사는 바닷속 궁전을 무엇이라고 해요? (두 글자)",
    answerText: ["용궁"],
    explain: "용왕이 사는 바닷속 궁전은 '용궁'이에요.",
  },
  {
    category: "word",
    type: "sa",
    q: "토끼를 데리러 육지에 온 동물의 이름을 쓰세요.",
    answerText: ["자라", "별주부"],
    explain: "토끼를 데리러 온 동물은 '자라(별주부)'예요.",
  },
];

/** 내용 퀴즈 (10): MC 7 · OX 2 · SA 1 */
export const CONTENT_QUIZ: QuizQuestion[] = [
  {
    category: "content",
    type: "mc",
    q: "용왕은 왜 토끼를 찾았어요?",
    options: ["병을 고치려고 토끼의 간이 필요해서", "친구가 되려고", "벼슬을 주려고", "같이 놀려고"],
    explain: "용왕은 병을 고치려고 토끼의 간이 필요했어요.",
  },
  {
    category: "content",
    type: "mc",
    q: "누가 토끼를 데리러 육지에 갔어요?",
    options: ["자라(별주부)", "용왕", "호랑이", "다른 토끼"],
    explain: "자라가 용감하게 나서서 육지로 갔어요.",
  },
  {
    category: "content",
    type: "mc",
    q: "자라는 토끼에게 무엇을 준다고 했어요?",
    options: ["높은 벼슬", "많은 돈", "빠른 배", "큰 집"],
    explain: "자라는 용궁에 가면 높은 벼슬을 준다고 했어요.",
  },
  {
    category: "content",
    type: "mc",
    q: "용궁에서 용왕은 토끼에게 무엇을 하려고 했어요?",
    options: ["간을 꺼내려고 했어요", "밥을 주려고 했어요", "벼슬을 주려고 했어요", "집에 보내려고 했어요"],
    explain: "용왕은 병을 고치려고 토끼의 간을 꺼내려 했어요.",
  },
  {
    category: "content",
    type: "mc",
    q: "토끼는 어떻게 용궁에서 살아 돌아왔어요?",
    options: [
      "간을 육지에 두고 왔다고 꾀를 냄",
      "힘으로 싸워서",
      "큰 소리로 노래를 불러서",
      "용왕과 친구가 되어서",
    ],
    explain: "토끼는 간을 육지에 두고 왔다고 거짓말(꾀)을 했어요.",
  },
  {
    category: "content",
    type: "mc",
    q: "토끼는 간을 어디에 두고 왔다고 했어요?",
    options: ["육지", "용궁", "바닷속 바위", "하늘"],
    explain: "토끼는 간을 육지에 두고 왔다고 했어요.",
  },
  {
    category: "content",
    type: "mc",
    q: "육지에 돌아온 토끼는 어떻게 됐어요?",
    options: ["재빨리 숲으로 달아났어요", "용궁으로 돌아갔어요", "자라와 함께 살았어요", "병이 들었어요"],
    explain: "토끼는 자라를 두고 재빨리 숲으로 달아났어요.",
  },
  {
    category: "content",
    type: "ox",
    q: "용왕은 토끼의 거짓말을 바로 알아챘다.",
    answerBool: false,
    explain: "아니에요. 용왕은 토끼의 꾀에 속아 그 말을 믿었어요.",
  },
  {
    category: "content",
    type: "ox",
    q: "토끼는 힘이 아니라 꾀(지혜)로 위기를 벗어났다.",
    answerBool: true,
    explain: "맞아요. 토끼는 슬기로운 꾀로 위기를 벗어났어요.",
  },
  {
    category: "content",
    type: "sa",
    q: "토끼가 '몸 밖에 두고 왔다'고 거짓말한 몸속 기관은 무엇이에요? (한 글자)",
    answerText: ["간"],
    explain: "토끼는 '간'을 육지에 두고 왔다고 거짓말했어요.",
  },
];

/** 단어 → 내용 순서로 이어 붙인 전체 20문항 */
export const ALL_QUIZ: QuizQuestion[] = [...WORD_QUIZ, ...CONTENT_QUIZ];

/** 주관식 정답 비교용 정규화(공백 제거) */
export function normalizeAnswer(s: string): string {
  return s.replace(/\s+/g, "").trim();
}

import type { ItemId } from "./items";

export interface ChestBand {
  min: number; // 이 점수 이상이면 이 상자 구간
  item: ItemId; // 상자 속 게임 아이템
  range: string; // 표시용 점수대
}

/**
 * 최종 점수대에 따라 '한 개'의 보물상자(아이템)를 연다.
 * 점수가 높을수록 더 좋은 아이템을 얻는다. (내림차순 정렬)
 */
export const CHEST_BANDS: ChestBand[] = [
  { min: 190, item: "star", range: "190점 이상" },
  { min: 160, item: "wings", range: "160–189점" },
  { min: 130, item: "shield", range: "130–159점" },
  { min: 100, item: "carrot", range: "100–129점" },
  { min: 60, item: "wind", range: "60–99점" },
];

/** 점수에 맞는 보물상자 구간(60점 미만이면 null) */
export function rewardBand(points: number): ChestBand | null {
  return CHEST_BANDS.find((b) => points >= b.min) ?? null;
}

export const POINTS_FIRST_TRY = 10; // 1번째 시도에 정답
export const POINTS_SECOND_TRY = 5; // 2번째 시도에 정답
export const PENALTY_WRONG = 5; // 객관식에서 3번째도 틀리면 감점
