import { redirect } from "next/navigation";
import { getViewer } from "@/lib/auth/viewer";
import { createAdminClient, hasAdminEnv } from "@/lib/supabase/admin";
import { hasSupabaseEnv } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

interface Log {
  id: number;
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

function fmt(ts: string): string {
  const d = new Date(ts);
  return `${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(
    2,
    "0",
  )} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

const MODE_LABEL: Record<string, string> = {
  tutor: "선생님",
  jara: "자라",
  tokki: "토끼",
  yongwang: "용왕",
};

export default async function StudentDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { user, isTeacher } = await getViewer();

  if (!hasSupabaseEnv()) redirect("/dashboard");
  if (!user) redirect("/login?next=/dashboard");
  if (!isTeacher || !hasAdminEnv()) redirect("/dashboard");

  const admin = createAdminClient();
  const [{ data: profile }, { data: logs }] = await Promise.all([
    admin.from("profiles").select("*").eq("id", id).maybeSingle(),
    admin
      .from("activity_logs")
      .select("*")
      .eq("user_id", id)
      .order("created_at", { ascending: true })
      .order("id", { ascending: true })
      .returns<Log[]>(),
  ]);

  const all = logs ?? [];
  const convs = all.filter(
    (l) => ["practice", "interview", "chat"].includes(l.feature) && l.turn_role,
  );
  const quizzes = all.filter((l) => l.feature === "quiz" && l.mode !== "summary");
  const games = all.filter((l) => l.feature === "game");

  // 대화: session_id별 묶기(순서 유지)
  const sessions: { key: string; mode: string | null; turns: Log[] }[] = [];
  const sIndex = new Map<string, number>();
  for (const l of convs) {
    const key = l.session_id ?? `none-${l.id}`;
    if (!sIndex.has(key)) {
      sIndex.set(key, sessions.length);
      sessions.push({ key, mode: l.mode, turns: [] });
    }
    sessions[sIndex.get(key)!].turns.push(l);
  }

  const email = (profile as { email?: string } | null)?.email ?? id.slice(0, 8);

  return (
    <main className="dash-wrap">
      <header className="dash-header">
        <a href="/dashboard" className="chat-back">
          ← 대시보드
        </a>
        <h1>🧑‍🎓 {email}</h1>
        <a
          className="btn ghost"
          href={`/api/dashboard/export?user=${id}`}
          download
        >
          ⬇️ 이 학생 CSV
        </a>
      </header>

      {/* 대화 */}
      <section className="dash-section">
        <h2>💬 말하기 연습 대화 ({sessions.length}세션)</h2>
        {sessions.length === 0 && <p className="dash-empty">기록 없음</p>}
        {sessions.map((s) => (
          <div key={s.key} className="dash-conv">
            <div className="dash-conv-head">
              {MODE_LABEL[s.mode ?? ""] ?? s.mode ?? "대화"} ·{" "}
              {s.turns[0] && fmt(s.turns[0].created_at)}
            </div>
            {s.turns.map((t) => (
              <div key={t.id} className={`dash-turn ${t.turn_role}`}>
                <span className="dash-turn-who">
                  {t.turn_role === "user" ? "학생" : "AI"}
                  {t.input_method === "voice" ? " 🎤" : ""}
                </span>
                <span className="dash-turn-text">{t.content}</span>
              </div>
            ))}
          </div>
        ))}
      </section>

      {/* 퀴즈 */}
      <section className="dash-section">
        <h2>🧩 퀴즈 응답 ({quizzes.length})</h2>
        {quizzes.length === 0 && <p className="dash-empty">기록 없음</p>}
        {quizzes.length > 0 && (
          <table className="dash-table">
            <thead>
              <tr>
                <th>시각</th>
                <th>문제</th>
                <th>정답</th>
                <th>결과</th>
              </tr>
            </thead>
            <tbody>
              {quizzes.map((q) => {
                const ok = q.meta?.is_correct === true;
                return (
                  <tr key={q.id}>
                    <td>{fmt(q.created_at)}</td>
                    <td>{String(q.meta?.question ?? q.content ?? "")}</td>
                    <td>{String(q.meta?.correct_answer ?? "")}</td>
                    <td>{ok ? "⭕ 정답" : "❌ 오답"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </section>

      {/* 게임 */}
      <section className="dash-section">
        <h2>🎮 게임 ({games.length})</h2>
        {games.length === 0 && <p className="dash-empty">기록 없음</p>}
        {games.length > 0 && (
          <table className="dash-table">
            <thead>
              <tr>
                <th>시각</th>
                <th>구분</th>
                <th>내용</th>
                <th>결과</th>
              </tr>
            </thead>
            <tbody>
              {games.map((g) => {
                const ev = String(g.meta?.event ?? "");
                return (
                  <tr key={g.id}>
                    <td>{fmt(g.created_at)}</td>
                    <td>{ev === "result" ? "결과" : "퀴즈"}</td>
                    <td>
                      {ev === "result"
                        ? `완주 여부: ${g.meta?.result === "win" ? "완주 🏁" : "실패"}`
                        : String(g.meta?.question ?? "")}
                    </td>
                    <td>
                      {ev === "result"
                        ? `문제 ${g.meta?.quizzes_answered ?? 0}개`
                        : g.meta?.is_correct === true
                          ? "⭕"
                          : "❌"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </section>
    </main>
  );
}
