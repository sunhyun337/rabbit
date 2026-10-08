import { NextRequest, NextResponse } from "next/server";
import { getChatClient, MAX_OUTPUT_TOKENS } from "@/lib/openai/client";
import { getCharacter } from "@/lib/story/characters";
import { logActivity } from "@/lib/supabase/log";

export const runtime = "nodejs";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}
interface PracticeBody {
  messages: ChatMessage[];
  mode: string; // "tutor" | "jara" | "tokki" | "yongwang"
  scene?: string; // 지금 보고 있는 장면(제목 등) — 선택
  sessionId?: string; // 대화 묶음 식별자
  inputMethod?: "voice" | "text"; // 음성/타이핑 입력 구분
}

const LEVEL = `한국어능력 4급(TOPIK 4) 수준의 쉽고 자연스러운 문장으로, 2~3문장으로만 짧게 말한다.
이모지·목록·굵은 글씨·해설·대본은 쓰지 않는다. 네가 AI라는 말은 하지 않는다.`;

export async function POST(req: NextRequest) {
  let body: PracticeBody;
  try {
    body = (await req.json()) as PracticeBody;
  } catch {
    return NextResponse.json({ error: "잘못된 요청 형식입니다." }, { status: 400 });
  }

  const messages = Array.isArray(body.messages) ? body.messages : [];
  const recent = messages.slice(-12);
  const scene = (body.scene || "").slice(0, 200);
  const mode = body.mode || "tutor";

  let system: string;
  if (mode === "tutor") {
    system = [
      "너는 고전 『토끼전』으로 한국어 '말하기'를 연습시키는 다정한 선생님이다.",
      "학습자가 지금 보고 있는 줄거리 장면에 대해 편하게 이야기하도록 돕는다.",
      LEVEL,
      `[방법]
- 학습자의 말에 먼저 따뜻하게 반응한 뒤, 학습자가 계속 말하도록 '질문은 한 번에 하나만' 한다.
- 정답을 강요하지 말고, 학습자가 자기 생각을 한국어로 표현하도록 격려한다.
- 어려운 낱말이 나오면 문장 안에서 쉽게 한 번만 풀어 준다.`,
      scene ? `지금 학습자가 보고 있는 장면: ${scene}` : "",
    ]
      .filter(Boolean)
      .join("\n\n");
  } else {
    const ch = getCharacter(mode);
    if (!ch) {
      return NextResponse.json({ error: "인물을 찾을 수 없습니다." }, { status: 400 });
    }
    system = [
      "[역할극 — 인터뷰] 너는 아래 인물 '본인'이다. 항상 1인칭으로, 그 인물의 성격과 입장으로 답한다.",
      ch.persona,
      LEVEL,
      `[방법]
- 학습자(인터뷰어)의 질문에 성실히 답한다. 작품에 없는 내용은 성격에 맞게 자연스럽게 상상해서 답해도 된다.
- 새로운 질문을 길게 하지 말고, 학습자가 다시 질문하도록 짧게 답한다.`,
      scene ? `지금 학습자가 보고 있는 장면: ${scene}` : "",
    ]
      .filter(Boolean)
      .join("\n\n");
  }

  try {
    const { client, model } = getChatClient();
    const completion = await client.chat.completions.create({
      model,
      max_tokens: MAX_OUTPUT_TOKENS,
      temperature: mode === "tutor" ? 0.5 : 0.7,
      messages: [
        { role: "system", content: system },
        ...recent.map((m) => ({ role: m.role, content: m.content })),
      ],
    });
    const reply = completion.choices[0]?.message?.content?.trim() ?? "";

    // 연구용 활동 기록(로그인 사용자만, 실패해도 응답에 영향 없음)
    const lastUser = [...recent].reverse().find((m) => m.role === "user");
    await logActivity([
      {
        feature: "practice",
        mode,
        scene: scene || null,
        session_id: body.sessionId ?? null,
        turn_role: "user",
        content: lastUser?.content ?? null,
        input_method: body.inputMethod === "voice" ? "voice" : "text",
      },
      {
        feature: "practice",
        mode,
        scene: scene || null,
        session_id: body.sessionId ?? null,
        turn_role: "assistant",
        content: reply,
      },
    ]);

    return NextResponse.json({ reply });
  } catch (err) {
    const message = err instanceof Error ? err.message : "알 수 없는 오류";
    console.error("[/api/practice]", message);
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
