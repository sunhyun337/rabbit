import OpenAI from "openai";

/**
 * 서버 전용 OpenAI 클라이언트. 절대 클라이언트 번들에서 import 하지 말 것.
 * (CLAUDE.md 절대규칙 1 — OpenAI 키는 서버 라우트에서만 사용)
 */

let client: OpenAI | null = null;

export function getOpenAI(): OpenAI {
  // 붙여넣기 과정에서 섞일 수 있는 공백·제어문자를 제거(인쇄 가능한 ASCII만)
  const apiKey = (process.env.OPENAI_API_KEY || "").replace(/[^\x21-\x7E]/g, "");
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY가 설정되지 않았습니다. .env.local을 확인하세요.");
  }
  if (!client) {
    client = new OpenAI({ apiKey });
  }
  return client;
}

export const CHAT_MODEL = process.env.OPENAI_CHAT_MODEL || "gpt-4o-mini";
export const MAX_OUTPUT_TOKENS = Number(process.env.MAX_OUTPUT_TOKENS || 500);
