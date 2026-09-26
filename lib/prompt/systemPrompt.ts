import { loadPrinciples, PRINCIPLE_COUNT, type Principle } from "./principles";

/**
 * 현재 단계(설계원리 번호)에 맞춰 튜터 에이전트의 시스템 프롬프트를 조립한다.
 * 규칙의 출처는 설계원리.md (AGENTS.md / CLAUDE.md 참고).
 */

const ROLE = `당신은 한국어능력 4급(TOPIK 4) 수준의 외국인 학습자가 고전소설 『토끼전』으로
'말하기'를 연습하도록 돕는 한국어 말하기 튜터입니다. 등장인물은 토끼, 자라(별주부), 용왕입니다.`;

const LEVEL_RULES = `[학습자 배려 — 반드시 지킬 것]
- 한 번에 한 가지만 질문하세요. 질문은 짧고 구체적으로.
- TOPIK 4급 수준의 쉬운 어휘와 문장을 쓰세요. 어려운 단어는 짧게 풀어 설명하세요.
- 학습자의 한국어가 불완전해도 먼저 '의미'를 확인한 뒤 대화를 이어가세요.
- 답(주제·교훈)을 먼저 말하지 말고, 질문으로 학습자가 스스로 말하도록 이끄세요.
- 응답은 3~4문장 이내로 짧게 유지하세요.`;

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
  /** 현재 진행 중인 설계원리 번호 (1~6) */
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

  return [
    ROLE,
    LEVEL_RULES,
    `[전체 학습 흐름 — 6단계 설계원리]\n${overview}`,
    `[현재 단계 상세]\n${activeBlock}`,
    `학습자가 현재 단계의 목표를 충분히 말하면, 자연스럽게 다음 단계로 넘어가세요.
마지막 단계(재구성)까지 마치면 학습자가 자신의 최종 해석을 근거와 함께 말하도록 하세요.`,
  ].join("\n\n");
}
