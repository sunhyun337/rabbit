import { NextRequest, NextResponse } from "next/server";
import { toFile } from "openai";
import { getOpenAI } from "@/lib/openai/client";

// 파일 업로드 처리 → Node 런타임
export const runtime = "nodejs";

const STT_MODEL = process.env.OPENAI_STT_MODEL || "whisper-1";
const MAX_BYTES = 20 * 1024 * 1024; // 20MB 상한(비용/남용 가드)

/** 음성(오디오 파일) → 텍스트. 학습자의 말하기를 인식(Whisper). */
export async function POST(req: NextRequest) {
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "오디오를 받지 못했습니다." }, { status: 400 });
  }

  const audio = form.get("audio");
  if (!(audio instanceof Blob)) {
    return NextResponse.json({ error: "오디오 파일이 없습니다." }, { status: 400 });
  }
  if (audio.size === 0) {
    return NextResponse.json({ error: "빈 오디오입니다." }, { status: 400 });
  }
  if (audio.size > MAX_BYTES) {
    return NextResponse.json({ error: "오디오가 너무 큽니다." }, { status: 413 });
  }

  try {
    const openai = getOpenAI();
    const bytes = Buffer.from(await audio.arrayBuffer());

    // 파일명/확장자를 실제 형식에 맞춰 결정 (Whisper가 확장자로 형식 판별)
    const uploadedName = audio instanceof File ? audio.name : "";
    let filename =
      uploadedName && /\.[a-z0-9]+$/i.test(uploadedName) ? uploadedName : "";
    if (!filename) {
      const t = (audio.type || "").toLowerCase();
      const ext = t.includes("webm")
        ? "webm"
        : t.includes("mp4") || t.includes("m4a")
          ? "m4a"
          : t.includes("mpeg") || t.includes("mp3")
            ? "mp3"
            : t.includes("wav")
              ? "wav"
              : t.includes("ogg")
                ? "ogg"
                : "webm";
      filename = `speech.${ext}`;
    }

    const file = await toFile(bytes, filename);
    const result = await openai.audio.transcriptions.create({
      file,
      model: STT_MODEL,
      language: "ko", // 한국어 학습자 발화
    });
    return NextResponse.json({ text: result.text.trim() });
  } catch (err) {
    const message = err instanceof Error ? err.message : "알 수 없는 오류";
    console.error("[/api/stt]", message);
    return NextResponse.json(
      { error: "음성 인식에 실패했습니다." },
      { status: 502 },
    );
  }
}
