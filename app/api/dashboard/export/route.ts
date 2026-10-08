import { NextRequest, NextResponse } from "next/server";
import { getViewer } from "@/lib/auth/viewer";
import { createAdminClient, hasAdminEnv } from "@/lib/supabase/admin";

export const runtime = "nodejs";

interface Row {
  id: number;
  user_id: string;
  session_id: string | null;
  feature: string;
  mode: string | null;
  turn_role: string | null;
  content: string | null;
  input_method: string | null;
  scene: string | null;
  meta: Record<string, unknown>;
  created_at: string;
}

function csvCell(v: unknown): string {
  const s = v === null || v === undefined ? "" : String(v);
  return `"${s.replace(/"/g, '""')}"`;
}

/** 교사 전용: 활동 로그를 CSV로 내보낸다. ?user=<id>로 학생 1명만 받을 수 있음. */
export async function GET(req: NextRequest) {
  const { user, isTeacher } = await getViewer();
  if (!user) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  if (!isTeacher || !hasAdminEnv())
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });

  const target = req.nextUrl.searchParams.get("user");
  const admin = createAdminClient();
  let query = admin
    .from("activity_logs")
    .select("*")
    .order("user_id", { ascending: true })
    .order("created_at", { ascending: true });
  if (target) query = query.eq("user_id", target);
  const { data } = await query.returns<Row[]>();
  const rows = data ?? [];

  // user_id → email 매핑
  const { data: profiles } = await admin
    .from("profiles")
    .select("id, email")
    .returns<{ id: string; email: string | null }[]>();
  const emailById = new Map<string, string>();
  (profiles ?? []).forEach((p) => emailById.set(p.id, p.email ?? ""));

  const headers = [
    "created_at",
    "email",
    "user_id",
    "session_id",
    "feature",
    "mode",
    "turn_role",
    "input_method",
    "scene",
    "content",
    "meta",
  ];
  const lines = [headers.map(csvCell).join(",")];
  for (const r of rows) {
    lines.push(
      [
        r.created_at,
        emailById.get(r.user_id) ?? "",
        r.user_id,
        r.session_id ?? "",
        r.feature,
        r.mode ?? "",
        r.turn_role ?? "",
        r.input_method ?? "",
        r.scene ?? "",
        r.content ?? "",
        JSON.stringify(r.meta ?? {}),
      ]
        .map(csvCell)
        .join(","),
    );
  }

  const csv = "﻿" + lines.join("\r\n"); // BOM: 엑셀 한글 깨짐 방지
  const name = target ? `activity_${target.slice(0, 8)}.csv` : "activity_all.csv";
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${name}"`,
    },
  });
}
