import { redirect } from "next/navigation";
import { getViewer } from "@/lib/auth/viewer";
import { createAdminClient, hasAdminEnv } from "@/lib/supabase/admin";
import { hasSupabaseEnv } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

interface Profile {
  id: string;
  email: string | null;
  display_name: string | null;
  role: string;
  research_consent: boolean;
  consent_at: string | null;
  created_at: string;
}
interface Summary {
  user_id: string;
  total_events: number;
  student_turns: number;
  voice_turns: number;
  quiz_answers: number;
  quiz_correct: number;
  game_events: number;
  first_active: string | null;
  last_active: string | null;
}

function fmt(ts: string | null): string {
  if (!ts) return "—";
  const d = new Date(ts);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(
    d.getDate(),
  ).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(
    d.getMinutes(),
  ).padStart(2, "0")}`;
}

export default async function DashboardPage() {
  const { user, isTeacher } = await getViewer();

  if (!hasSupabaseEnv()) {
    return (
      <Shell>
        <p className="dash-notice">
          ⚙️ Supabase가 아직 연결되지 않았어요. <code>.env.local</code>에 Supabase 키와{" "}
          <code>SUPABASE_SERVICE_ROLE_KEY</code>, <code>TEACHER_EMAILS</code>를 설정하고{" "}
          <code>supabase/schema.sql</code>을 실행하세요.
        </p>
      </Shell>
    );
  }
  if (!user) redirect("/login?next=/dashboard");
  if (!isTeacher) {
    return (
      <Shell>
        <p className="dash-notice">
          🔒 교사 전용 페이지예요. 이 계정({user.email})은 교사로 지정되지 않았어요.
        </p>
      </Shell>
    );
  }
  if (!hasAdminEnv()) {
    return (
      <Shell>
        <p className="dash-notice">
          ⚙️ 연구 데이터 조회에는 <code>SUPABASE_SERVICE_ROLE_KEY</code>가 필요해요.
          서버 환경변수에 설정해 주세요.
        </p>
      </Shell>
    );
  }

  const admin = createAdminClient();
  const [{ data: profiles }, { data: summaries }] = await Promise.all([
    admin
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: true })
      .returns<Profile[]>(),
    admin.from("activity_summary").select("*").returns<Summary[]>(),
  ]);

  const sumByUser = new Map<string, Summary>();
  (summaries ?? []).forEach((s) => sumByUser.set(s.user_id, s));
  const rows = (profiles ?? []).filter((p) => p.role !== "teacher");

  const totals = rows.reduce(
    (acc, p) => {
      const s = sumByUser.get(p.id);
      acc.students += 1;
      acc.turns += s?.student_turns ?? 0;
      acc.quiz += s?.quiz_answers ?? 0;
      return acc;
    },
    { students: 0, turns: 0, quiz: 0 },
  );

  return (
    <Shell email={user.email ?? undefined}>
      <div className="dash-stats">
        <Stat n={totals.students} label="학생 수" />
        <Stat n={totals.turns} label="학생 발화(턴)" />
        <Stat n={totals.quiz} label="퀴즈 응답" />
      </div>

      <div className="dash-actions">
        <a className="btn ghost" href="/api/dashboard/export" download>
          ⬇️ 전체 CSV 내보내기
        </a>
      </div>

      {rows.length === 0 ? (
        <p className="dash-notice">아직 가입한 학생이 없어요.</p>
      ) : (
        <div className="dash-table-wrap">
          <table className="dash-table">
            <thead>
              <tr>
                <th>학생(이메일)</th>
                <th>동의</th>
                <th>발화</th>
                <th>음성</th>
                <th>퀴즈(정답)</th>
                <th>게임</th>
                <th>마지막 활동</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((p) => {
                const s = sumByUser.get(p.id);
                return (
                  <tr key={p.id}>
                    <td>{p.email ?? p.id.slice(0, 8)}</td>
                    <td>{p.research_consent ? "✅" : "—"}</td>
                    <td>{s?.student_turns ?? 0}</td>
                    <td>{s?.voice_turns ?? 0}</td>
                    <td>
                      {s?.quiz_answers ?? 0}
                      {s?.quiz_answers ? ` (${s.quiz_correct})` : ""}
                    </td>
                    <td>{s?.game_events ?? 0}</td>
                    <td>{fmt(s?.last_active ?? null)}</td>
                    <td>
                      <a className="dash-link" href={`/dashboard/${p.id}`}>
                        자세히 →
                      </a>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </Shell>
  );
}

function Stat({ n, label }: { n: number; label: string }) {
  return (
    <div className="dash-stat">
      <div className="dash-stat-n">{n}</div>
      <div className="dash-stat-label">{label}</div>
    </div>
  );
}

function Shell({
  children,
  email,
}: {
  children: React.ReactNode;
  email?: string;
}) {
  return (
    <main className="dash-wrap">
      <header className="dash-header">
        <a href="/" className="chat-back">
          ← 홈
        </a>
        <h1>📊 교사 대시보드</h1>
        {email && <span className="dash-who">{email}</span>}
      </header>
      {children}
    </main>
  );
}
