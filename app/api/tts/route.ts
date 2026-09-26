import { NextRequest, NextResponse } from "next/server";
import { getOpenAI } from "@/lib/openai/client";

// OpenAI SDK 사용 → Node 런타임
export const runtime = "nodejs";

const TTS_MODEL = process.env.OPENAI_TTS_MODEL || "gpt-4o-mini-tts";
const TTS_VOICE = process.env.OPENAI_TTS_VOICE || "alloy";

interface TtsBody {
  text: string;
}

/** 텍스트 → 음성(mp3). 에이전트 발화를 음성으로 들려주기 위함. */
export async function POST(req: NextRequest) {
  let body: TtsBody;
  try {
    body = (await req.json()) as TtsBody;
  } catch {
    return NextResponse.json({ error: "잘못된 요청 형식입니다." }, { status: 400 });
  }

  const text = (body.text || "").trim().slice(0, 2000); // 비용 가드
  if (!text) {
    return NextResponse.json({ error: "읽을 텍스트가 없습니다." }, { status: 400 });
  }

  try {
    const openai = getOpenAI();
    const speech = await openai.audio.speech.create({
      model: TTS_MODEL,
      voice: TTS_VOICE,
      input: text,
      response_format: "mp3",
    });
    const buffer = Buffer.from(await speech.arrayBuffer());
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "알 수 없는 오류";
    console.error("[/api/tts]", message);
    return NextResponse.json(
      { error: "음성 생성에 실패했습니다." },
      { status: 502 },
    );
  }
}
