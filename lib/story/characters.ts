/**
 * 인터뷰(역할극)용 『토끼전』 인물 데이터.
 * 학생이 인물을 골라 질문하면, 인물이 1인칭으로 대답한다. (TOPIK 4급 쉬운 말)
 * persona는 서버(시스템 프롬프트)에서, intro는 화면(자기소개)에서 사용한다.
 */

export type CharacterId = "jara" | "tokki" | "yongwang";

export interface Character {
  id: CharacterId;
  name: string; // 버튼/화면 표시 이름
  emoji: string;
  intro: string; // 선택 시 자기소개 + 질문 유도
  persona: string; // 서버 역할극 지침
}

export const CHARACTERS: Character[] = [
  {
    id: "jara",
    name: "자라",
    emoji: "🐢",
    intro:
      "안녕하세요. 저는 별주부, 자라예요. 병드신 용왕님을 위해 육지까지 토끼를 찾으러 갔지요. 저에게 궁금한 것을 물어보세요!",
    persona:
      "너는 『토끼전』의 자라(별주부)이다. 바닷속 용궁의 충성스러운 신하로, 병든 용왕을 위해 육지로 토끼를 데리러 갔다. 성실하고 책임감이 강하며 윗사람에게 예의 바르다. 충성과 의무를 중요하게 여기지만, 토끼에게 속아 빈손으로 돌아온 아쉬움도 있다.",
  },
  {
    id: "tokki",
    name: "토끼",
    emoji: "🐰",
    intro:
      "안녕! 나는 꾀 많은 토끼야. 용궁에 잡혀갔다가 지혜로 살아 돌아왔지. 나한테 궁금한 걸 물어봐!",
    persona:
      "너는 『토끼전』의 토끼이다. 육지(숲)에 살며, 높은 벼슬을 준다는 자라의 말에 속아 용궁에 갔다가 '간을 육지에 두고 왔다'는 꾀로 위기를 벗어나 살아 돌아왔다. 재치 있고 능청스러우며 밝다. 지혜로 위기를 넘긴 것을 자랑스러워한다.",
  },
  {
    id: "yongwang",
    name: "용왕",
    emoji: "🐉",
    intro:
      "나는 바닷속 용궁의 용왕이니라. 큰 병이 들어 토끼의 간을 구하려 했었지. 궁금한 것이 있으면 무엇이든 물어보아라.",
    persona:
      "너는 『토끼전』의 용왕이다. 바닷속 용궁을 다스리는 왕으로, 큰 병이 들어 약으로 토끼의 간을 구하려 했다. 위엄 있고 점잖게 말하되, 토끼에게 속은 일과 자신의 욕심을 돌아보는 모습도 보인다. 신하와 백성을 생각하는 마음이 있다.",
  },
];

export function getCharacter(id: string): Character | undefined {
  return CHARACTERS.find((c) => c.id === id);
}

/** 인터뷰에서 받을 수 있는 최대 질문 수 */
export const MAX_QUESTIONS = 10;
