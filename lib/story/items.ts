/**
 * 퀴즈 ↔ 게임 연계 아이템.
 * 퀴즈에서 점수로 보물상자를 열면 아이템을 '획득'(localStorage 저장)하고,
 * 게임 시작 화면에서 '장착'하면 효과가 적용된다.
 */

export type ItemId = "wind" | "carrot" | "shield" | "wings" | "star";

export interface GameItem {
  id: ItemId;
  icon: string;
  name: string;
  desc: string; // 게임 효과 설명
}

export const ITEMS: GameItem[] = [
  { id: "wind", icon: "💨", name: "바람 부적", desc: "출발 가속이 빨라져요" },
  { id: "carrot", icon: "🥕", name: "황금 당근", desc: "더 높이 점프해요" },
  { id: "shield", icon: "🛡️", name: "등딱지 방패", desc: "물웅덩이·오답에도 안 느려져요" },
  { id: "wings", icon: "🪽", name: "날개", desc: "달리기 속도가 빨라져요" },
  { id: "star", icon: "⭐", name: "행운의 별", desc: "자라가 느려져요" },
];

export function getItem(id: string): GameItem | undefined {
  return ITEMS.find((i) => i.id === id);
}

// ===== 인벤토리(획득 아이템) — localStorage (브라우저별 저장) =====
const STORAGE_KEY = "rabbit_items_v1";

export function getEarnedItems(): ItemId[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw) as string[];
    return ITEMS.filter((i) => arr.includes(i.id)).map((i) => i.id);
  } catch {
    return [];
  }
}

export function addEarnedItem(id: ItemId): void {
  try {
    const cur = new Set(getEarnedItems());
    cur.add(id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...cur]));
  } catch {
    /* 저장 실패는 무시(비공개 모드 등) */
  }
}
