import { NextRequest, NextResponse } from "next/server";
import { getChatClient, MAX_OUTPUT_TOKENS } from "@/lib/openai/client";

export const runtime = "nodejs";

interface RemixBody {
  change?: string; // 이야기 변화(라벨)
  mood?: string; // 분위기 변화(라벨)
  custom?: string; // 꼭 넣고 싶은 내용
}

/**
 * 이야기 끝에 붙은 '학습자에게 묻는 질문'(물음표로 끝나는 문장)을 제거한다.
 * 제목(첫 줄)과 줄바꿈 구조는 보존하고, 마지막 문단의 끝 질문만 떼어낸다.
 */
function stripTrailingQuestions(text: string): string {
  const lines = text.replace(/\s+$/, "").split("\n");
  let i = lines.length - 1;
  while (i >= 0 && lines[i].trim() === "") i--;
  if (i <= 0) return text.trim(); // 제목만 있으면 그대로

  const parts = lines[i].trim().split(/(?<=[.!?。…])\s+/);
  while (parts.length > 0 && /[?？]\s*$/.test(parts[parts.length - 1].trim())) {
    parts.pop();
  }
  const newLine = parts.join(" ").trim();
  if (newLine) lines[i] = newLine;
  else lines.splice(i, 1); // 마지막 줄 전체가 질문이면 줄째로 제거

  return lines.join("\n").trim();
}

export async function POST(req: NextRequest) {
  let body: RemixBody;
  try {
    body = (await req.json()) as RemixBody;
  } catch {
    return NextResponse.json({ error: "잘못된 요청 형식입니다." }, { status: 400 });
  }

  const change = (body.change || "").slice(0, 60);
  const mood = (body.mood || "").slice(0, 40);
  const custom = (body.custom || "").slice(0, 300);

  const system = [
    "너는 고전 『토끼전』으로 상상력을 길러 주는 한국어 글쓰기·말하기 선생님이다.",
    "학습자가 고른 조건에 맞춰 『토끼전』을 새롭게 바꾼 '짧은 이야기'를 지어 준다.",
    `[규칙 — 반드시 지킬 것]
- 한국어능력 4급(TOPIK 4) 수준의 쉽고 자연스러운 문장으로 쓴다.
- 맨 첫 줄에 이야기 '제목'을 한 줄 쓴다(따옴표·번호 없이).
- 그다음 5~8문장 분량의 이야기를 쓴다. 너무 길게 늘이지 않는다.
- 토끼·자라(별주부)·용왕이 나오는 『토끼전』 세계를 유지하되, 고른 조건을 창의적으로 반영한다.
- '이야기(결말)로' 자연스럽게 끝맺는다. 학습자에게 생각·의견을 묻지 말고, 물음표(?)로 끝나는 문장으로 마무리하지 않는다.
- 이모지·목록(번호/하이픈)·굵은 글씨·해설 없이, 이야기 문장으로만 쓴다.`,
  ].join("\n\n");

  const parts: string[] = [];
  if (change) parts.push(`이야기 변화: ${change}`);
  if (mood) parts.push(`분위기: ${mood}`);
  if (custom) parts.push(`꼭 넣고 싶은 내용: ${custom}`);
  if (parts.length === 0) parts.push("자유롭게 재미있는 토끼전 다시 쓰기를 해 주세요.");
  const user = parts.join("\n") + "\n\n이 조건으로 새로운 토끼전 이야기를 지어 주세요.";

  try {
    const { client, model } = getChatClient();
    const completion = await client.chat.completions.create({
      model,
      max_tokens: MAX_OUTPUT_TOKENS,
      temperature: 0.9,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    });
    const raw = completion.choices[0]?.message?.content?.trim() ?? "";
    const reply = stripTrailingQuestions(raw);
    return NextResponse.json({ reply });
  } catch (err) {
    const message = err instanceof Error ? err.message : "알 수 없는 오류";
    console.error("[/api/remix]", message);
    const status =
      typeof (err as { status?: number })?.status === "number"
        ? (err as { status: number }).status
        : 500;
    let userMessage = "이야기를 만드는 중 문제가 생겼어요. 잠시 후 다시 시도해 주세요.";
    if (status === 401) userMessage = "AI 인증 오류입니다. API 키를 확인하세요.";
    else if (status === 429)
      userMessage =
        message.includes("credit") || message.includes("quota")
          ? "AI 사용 한도/크레딧이 부족합니다. 결제/크레딧을 확인하세요."
          : "요청이 많습니다. 잠시 후 다시 시도하세요.";
    return NextResponse.json({ error: userMessage }, { status: 502 });
  }
}
