import { NextRequest, NextResponse } from "next/server";
import { getOpenAI, CHAT_MODEL, MAX_OUTPUT_TOKENS } from "@/lib/openai/client";
import { buildSystemPrompt } from "@/lib/prompt/systemPrompt";
import { PRINCIPLE_COUNT } from "@/lib/prompt/principles";

// 파일 시스템(설계원리.md)을 읽으므로 Node 런타임 사용
export const runtime = "nodejs";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface ChatRequestBody {
  messages: ChatMessage[];
  currentPrinciple?: number;
}

export async function POST(req: NextRequest) {
  let body: ChatRequestBody;
  try {
    body = (await req.json()) as ChatRequestBody;
  } catch {
    return NextResponse.json({ error: "잘못된 요청 형식입니다." }, { status: 400 });
  }

  const messages = Array.isArray(body.messages) ? body.messages : [];
  const currentPrinciple = Math.min(
    Math.max(Number(body.currentPrinciple) || 1, 1),
    PRINCIPLE_COUNT,
  );

  // 입력 방어: 최근 대화만 사용(비용 가드)
  const recent = messages.slice(-12);

  try {
    const systemPrompt = buildSystemPrompt({ currentPrinciple });
    const openai = getOpenAI();

    const completion = await openai.chat.completions.create({
      model: CHAT_MODEL,
      max_tokens: MAX_OUTPUT_TOKENS,
      temperature: 0.7,
      messages: [
        { role: "system", content: systemPrompt },
        ...recent.map((m) => ({ role: m.role, content: m.content })),
      ],
    });

    const reply = completion.choices[0]?.message?.content?.trim() ?? "";
    return NextResponse.json({ reply, currentPrinciple });
  } catch (err) {
    const message = err instanceof Error ? err.message : "알 수 없는 오류";
    console.error("[/api/chat]", message);

    // OpenAI 오류 상태별 안내 (개발/운영 중 원인 파악용)
    const status =
      typeof (err as { status?: number })?.status === "number"
        ? (err as { status: number }).status
        : 500;

    let userMessage = "응답 생성 중 문제가 발생했습니다. 잠시 후 다시 시도하세요.";
    if (status === 401) userMessage = "OpenAI 인증 오류입니다. API 키를 확인하세요.";
    else if (status === 429)
      userMessage =
        message.includes("credit") || message.includes("quota")
          ? "OpenAI 크레딧이 부족합니다. 결제/크레딧을 확인하세요."
          : "요청이 많습니다. 잠시 후 다시 시도하세요.";

    return NextResponse.json({ error: userMessage }, { status: 502 });
  }
}
