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

/**
 * 대화(Chat)용 클라이언트와 모델을 반환한다.
 * AI_PROVIDER=upstage 이면 Upstage Solar(OpenAI 호환 API)를 사용한다.
 * (음성 STT/TTS는 Upstage가 제공하지 않으므로 OpenAI를 그대로 사용 — getOpenAI)
 */
let chatClient: OpenAI | null = null;

export function getChatClient(): { client: OpenAI; model: string; provider: string } {
  const provider = (process.env.AI_PROVIDER || "openai").toLowerCase();

  if (provider === "upstage") {
    const apiKey = (process.env.UPSTAGE_API_KEY || "").replace(/[^\x21-\x7E]/g, "");
    if (!apiKey) {
      throw new Error("UPSTAGE_API_KEY가 설정되지 않았습니다. .env.local을 확인하세요.");
    }
    const baseURL = process.env.UPSTAGE_BASE_URL || "https://api.upstage.ai/v1";
    const model = process.env.UPSTAGE_CHAT_MODEL || "solar-pro2";
    if (!chatClient) chatClient = new OpenAI({ apiKey, baseURL });
    return { client: chatClient, model, provider };
  }

  return { client: getOpenAI(), model: CHAT_MODEL, provider: "openai" };
}
