import { NextRequest, NextResponse } from "next/server";
import { logActivity, type LogEntry } from "@/lib/supabase/log";

export const runtime = "nodejs";

/** 클라이언트(퀴즈/게임 등)가 활동을 기록할 때 호출. 본인 것만 저장됨(RLS). */
export async function POST(req: NextRequest) {
  let body: { entries?: LogEntry[] };
  try {
    body = (await req.json()) as { entries?: LogEntry[] };
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  const entries = Array.isArray(body.entries) ? body.entries.slice(0, 50) : [];
  await logActivity(entries);
  return NextResponse.json({ ok: true });
}
