import { loadPrinciples, PRINCIPLE_COUNT, type Principle } from "./principles";
import { SCENE_QUESTIONS } from "../story/questions";

/**
 * 현재 단계(설계원리 번호)에 맞춰 튜터 에이전트의 시스템 프롬프트를 조립한다.
 * 규칙의 출처는 설계원리.md (AGENTS.md / CLAUDE.md 참고).
 */

const ROLE = `당신은 한국어능력 4급(TOPIK 4) 수준의 외국인 학습자가 고전소설 『토끼전』으로
'말하기'를 연습하도록 돕는 한국어 말하기 튜터입니다. 등장인물은 토끼, 자라(별주부), 용왕입니다.`;

const LEVEL_RULES = `[학습자 배려 — 반드시 지킬 것]
- TOPIK 4급 수준의 쉬운 어휘와 문장을 쓰세요.
- 학습자의 한국어가 불완전해도 먼저 '의미'를 확인한 뒤 대화를 이어가세요.
- 답(주제·교훈)을 먼저 말하지 말고, 질문으로 학습자가 스스로 말하도록 이끄세요.`;

const FORMAT_RULES = `[답변 형식 — 매우 중요, 반드시 지킬 것]
- 짧고 자연스러운 말투로, 2~3문장으로만 답하세요.
- 아래 요소는 절대로 덧붙이지 마세요:
  · 어휘 풀이 목록(예: "🌟 토픽 4급 표현", "단어 = 뜻" 같은 정리)
  · 안내·팁 문구(예: '"왜 ~ 했나요?"로 질문해 주세요')
  · 괄호 속 보충 질문이나 해설 블록
  · 이모지, 굵은 글씨 제목, 인용(>) 표시 같은 꾸밈
- 꼭 필요한 낱말 뜻은 문장 안에 자연스럽게 한 번만 녹여서 설명하세요.
- 지금 '당신의 한 번의 대답'만 쓰세요. 학습자의 다음 말을 예상하거나 "(학습자가 ~라고 답하면)" 같은 가상 대화·대본을 절대 쓰지 마세요.`;

const FEEDBACK_RULES = `[당신의 역할 — 피드백만 (매우 중요, 반드시 지킬 것)]
- 다음 질문은 '앱의 단계 버튼'이 자동으로 보여 줍니다. 그러니 당신은 '질문을 절대 하지 마세요'.
- 답변에 '물음표(?)'를 쓰지 마세요. 되묻기·확인 질문·후속 질문 모두 금지입니다.
- 학습자가 방금 한 답에 대해서만 1~2문장으로 따뜻하게 반응하는 '평서문'으로만 답하세요.
- 학습자의 한국어가 불완전하면, 더 자연스러운 표현을 '한 번만' 평서문으로 부드럽게 제안하세요.
- 다음 단계나 다음 질문을 재촉하지 말고, 지금 답에 대한 격려와 짧은 보완에만 집중하세요.`;

/** 특정 원리 하나를 프롬프트 텍스트로 */
function principleBlock(p: Principle, active: boolean): string {
  const head = `### 설계원리 ${p.no}. ${p.title}${active ? "  ← 지금 이 단계" : ""}`;
  const desc = p.description ? `\n${p.description}` : "";
  const guides =
    active && p.guidelines.length
      ? "\n[이 단계에서 따를 지침]\n" +
        p.guidelines.map((g) => `- (${g.no}) ${g.text}`).join("\n")
      : "";
  return `${head}${desc}${guides}`;
}

export interface BuildOptions {
  /** 현재 진행 중인 설계원리(단계) 번호 (1~6) */
  currentPrinciple: number;
}

export function buildSystemPrompt({ currentPrinciple }: BuildOptions): string {
  const principles = loadPrinciples();
  const current = Math.min(Math.max(currentPrinciple, 1), PRINCIPLE_COUNT);

  const overview = principles
    .map((p) => `- ${p.no}. ${p.title}`)
    .join("\n");

  const activeBlock = principles
    .filter((p) => p.no === current)
    .map((p) => principleBlock(p, true))
    .join("\n\n");

  const sceneRef = SCENE_QUESTIONS.map(
    (s) =>
      `- ${s.no}. ${s.title}\n${s.questions.map((q) => `   · ${q}`).join("\n")}`,
  ).join("\n");

  const STORY_QUESTIONS = `[줄거리 배경 지식 — 참고용(그대로 출력하지 말 것)]
아래는 피드백을 할 때 참고할 작품 배경일 뿐입니다. 이 목록이나 질문을 학습자에게 묻지 마세요.
학습자의 답이 작품 내용과 맞는지 가늠하는 데만 쓰고, 주제·교훈을 먼저 말하지 마세요.
${sceneRef}`;

  return [
    ROLE,
    LEVEL_RULES,
    FORMAT_RULES,
    FEEDBACK_RULES,
    `[전체 학습 흐름 — 6단계 설계원리]\n${overview}`,
    `[지금 학습자가 답하고 있는 단계 — 이 관점에서 피드백하세요]\n${activeBlock}`,
    STORY_QUESTIONS,
  ].join("\n\n");
}
