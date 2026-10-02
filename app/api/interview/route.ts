import { NextRequest, NextResponse } from "next/server";
import { getChatClient, MAX_OUTPUT_TOKENS } from "@/lib/openai/client";
import { getCharacter } from "@/lib/story/characters";

export const runtime = "nodejs";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface InterviewBody {
  messages: ChatMessage[];
  character: string;
}

export async function POST(req: NextRequest) {
  let body: InterviewBody;
  try {
    body = (await req.json()) as InterviewBody;
  } catch {
    return NextResponse.json({ error: "잘못된 요청 형식입니다." }, { status: 400 });
  }

  const character = getCharacter(body.character);
  if (!character) {
    return NextResponse.json({ error: "인물을 찾을 수 없습니다." }, { status: 400 });
  }

  const messages = Array.isArray(body.messages) ? body.messages : [];
  const recent = messages.slice(-12); // 비용 가드

  const systemPrompt = [
    `[역할극 — 인터뷰]`,
    character.persona,
    `[말하기 규칙 — 반드시 지킬 것]
- 너는 '${character.name}' 본인이다. 항상 1인칭으로, 그 인물의 입장과 성격으로 대답하라.
- 한국어능력 4급(TOPIK 4) 수준의 쉽고 짧은 문장으로, 2~3문장으로만 답하라.
- 학생(인터뷰어)의 질문에 성실히 답하라. 작품에 없는 내용은 인물의 성격에 맞게 자연스럽게 상상해서 답해도 된다.
- 해설·목록·이모지·꾸밈 없이, 대화하듯 말하라. 네가 AI라는 말은 하지 마라.
- 먼저 새로운 질문을 길게 하지 말고, 학생이 다시 질문하도록 짧게 answer 위주로 답하라.`,
  ].join("\n\n");

  try {
    const { client, model } = getChatClient();
    const completion = await client.chat.completions.create({
      model,
      max_tokens: MAX_OUTPUT_TOKENS,
      temperature: 0.7,
      messages: [
        { role: "system", content: systemPrompt },
        ...recent.map((m) => ({ role: m.role, content: m.content })),
      ],
    });
    const reply = completion.choices[0]?.message?.content?.trim() ?? "";
    return NextResponse.json({ reply });
  } catch (err) {
    const message = err instanceof Error ? err.message : "알 수 없는 오류";
    console.error("[/api/interview]", message);
    const status =
      typeof (err as { status?: number })?.status === "number"
        ? (err as { status: number }).status
        : 500;
    let userMessage = "응답 생성 중 문제가 발생했습니다. 잠시 후 다시 시도하세요.";
    if (status === 401) userMessage = "AI 인증 오류입니다. API 키를 확인하세요.";
    else if (status === 429)
      userMessage =
        message.includes("credit") || message.includes("quota")
          ? "AI 사용 한도/크레딧이 부족합니다. 결제/크레딧을 확인하세요."
          : "요청이 많습니다. 잠시 후 다시 시도하세요.";
    return NextResponse.json({ error: userMessage }, { status: 502 });
  }
}
