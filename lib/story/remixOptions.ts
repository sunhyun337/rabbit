/**
 * '이야기 바꾸기'(작품 재구성, 설계원리6) 선택지.
 * 학습자가 '이야기 변화'와 '분위기 변화'를 골라 『토끼전』을 새롭게 상상한다.
 */

export interface RemixOption {
  id: string;
  label: string;
}

/** 이야기 변화 — 무엇을 바꿀까 */
export const CHANGE_OPTIONS: RemixOption[] = [
  { id: "choice", label: "주인공이 다른 선택을 한다면" },
  { id: "perspective", label: "다른 인물의 눈으로 본다면" },
  { id: "ending", label: "결말이 달라진다면" },
  { id: "afterending", label: "결말 뒤에 모험이 이어진다면" },
  { id: "setting", label: "시대와 장소가 바뀐다면" },
  { id: "secret", label: "숨겨진 비밀과 수수께끼가 있다면" },
];

/** 분위기 변화 — 어떤 느낌으로 */
export const MOOD_OPTIONS: RemixOption[] = [
  { id: "adventure", label: "두근두근 모험" },
  { id: "funny", label: "엉뚱하고 유쾌하게" },
  { id: "mystery", label: "비밀스럽고 궁금하게" },
  { id: "fantasy", label: "신비롭고 환상적으로" },
  { id: "unpredictable", label: "예측할 수 없게" },
];

export function changeLabel(id: string): string {
  return CHANGE_OPTIONS.find((o) => o.id === id)?.label ?? "";
}
export function moodLabel(id: string): string {
  return MOOD_OPTIONS.find((o) => o.id === id)?.label ?? "";
}
