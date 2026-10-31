"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient, hasSupabaseEnv } from "@/lib/supabase/client";

type Mode = "login" | "signup";

function LoginInner() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "/";
  const configured = hasSupabaseEnv();

  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [consent, setConsent] = useState(false);
  const [privacyConsent, setPrivacyConsent] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setMsg(null);

    if (!configured) {
      setErr("인증이 아직 설정되지 않았어요. (관리자에게 Supabase 키 설정을 요청하세요.)");
      return;
    }
    if (!email.trim() || password.length < 6) {
      setErr("아이디(이메일)를 입력하고 비밀번호는 6자 이상으로 해 주세요.");
      return;
    }
    if (mode === "signup" && !privacyConsent) {
      setErr("개인정보 수집·이용 및 처리방침에 동의해야 가입할 수 있어요.");
      return;
    }
    if (mode === "signup" && !consent) {
      setErr("연구 데이터 활용 안내에 동의해야 가입할 수 있어요.");
      return;
    }

    setBusy(true);
    try {
      const supabase = createClient();
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (error) throw error;
        router.push(next);
        router.refresh();
      } else {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
        });
        if (error) throw error;
        // 이메일 승인을 사용하지 않으므로 가입 즉시 로그인된다.
        // 혹시 세션이 없으면(설정 반영 지연 등) 비밀번호로 바로 로그인한다.
        if (!data.session) {
          const { error: signInError } = await supabase.auth.signInWithPassword({
            email: email.trim(),
            password,
          });
          if (signInError) throw signInError;
        }
        // 연구 데이터 활용 동의 기록
        try {
          await fetch("/api/consent", { method: "POST" });
        } catch {
          /* 동의 기록 실패는 무시 */
        }
        router.push(next);
        router.refresh();
      }
    } catch (e) {
      // Supabase 오류는 message뿐 아니라 code(예: invalid_credentials)도 함께 본다
      const ae = e as { message?: unknown; code?: unknown };
      const raw = [ae?.code, ae?.message]
        .map((v) => (typeof v === "string" ? v : ""))
        .join(" ");
      setErr(translateError(raw));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="container auth">
      <a href="/" className="chat-back">
        ← 홈
      </a>
      <div className="card auth-card">
        <h1>🐰 토끼전 말하기</h1>
        <p className="auth-sub">
          {mode === "login"
            ? "로그인하고 대화·게임을 이용하세요."
            : "회원가입 후 대화·게임을 이용할 수 있어요."}
        </p>

        {!configured && (
          <div className="auth-notice">
            ⚙️ 아직 인증(Supabase)이 연결되지 않았어요. 아래는 미리보기이며,
            Supabase 키를 설정하면 실제 가입·로그인이 작동합니다.
          </div>
        )}

        <div className="auth-tabs">
          <button
            className={mode === "login" ? "active" : ""}
            onClick={() => {
              setMode("login");
              setErr(null);
              setMsg(null);
            }}
            type="button"
          >
            로그인
          </button>
          <button
            className={mode === "signup" ? "active" : ""}
            onClick={() => {
              setMode("signup");
              setErr(null);
              setMsg(null);
            }}
            type="button"
          >
            회원가입
          </button>
        </div>

        <form onSubmit={onSubmit} className="auth-form">
          <label>
            아이디 (이메일)
            <input
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="example@email.com"
            />
          </label>
          <label>
            비밀번호
            <input
              type="password"
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="6자 이상"
            />
          </label>

          {mode === "signup" && (
            <>
              <label className="auth-consent">
                <input
                  type="checkbox"
                  checked={privacyConsent}
                  onChange={(e) => setPrivacyConsent(e.target.checked)}
                />
                <span>
                  <b>개인정보 수집·이용 및 처리방침</b>에 동의합니다. (필수){" "}
                  <a href="/privacy" target="_blank" rel="noopener noreferrer">
                    처리방침 보기
                  </a>
                </span>
              </label>
              <label className="auth-consent">
                <input
                  type="checkbox"
                  checked={consent}
                  onChange={(e) => setConsent(e.target.checked)}
                />
                <span>
                  학습 과정에서 입력한 대화·퀴즈·게임 기록이 <b>익명으로 교육 연구에
                  활용</b>되는 것에 동의합니다. (언제든 문의해 삭제를 요청할 수 있어요.)
                </span>
              </label>
            </>
          )}

          {err && <p className="auth-err">{err}</p>}
          {msg && <p className="auth-msg">{msg}</p>}

          <button className="btn" type="submit" disabled={busy}>
            {busy ? "처리 중…" : mode === "login" ? "로그인" : "회원가입"}
          </button>
        </form>
      </div>
    </main>
  );
}

function translateError(raw: string): string {
  // 밑줄을 공백으로 바꿔 code(invalid_credentials)와 message(Invalid login credentials)를 함께 매칭
  const s = raw.toLowerCase().replace(/_/g, " ");
  if (s.includes("invalid login") || s.includes("invalid credentials"))
    return "아이디 또는 비밀번호가 올바르지 않아요.";
  if (
    s.includes("already registered") ||
    s.includes("already been registered") ||
    s.includes("user already exists")
  )
    return "이미 가입된 이메일이에요. 로그인해 주세요.";
  if (s.includes("invalid api key") || s.includes("api key"))
    return "인증 설정에 문제가 있어요. (관리자에게 문의해 주세요.)";
  if (
    s.includes("rate limit") ||
    s.includes("too many") ||
    s.includes("over request")
  )
    return "요청이 너무 많아요. 잠시 후 다시 시도해 주세요.";
  if (s.includes("password")) return "비밀번호를 확인해 주세요. (6자 이상)";
  return "잠시 후 다시 시도해 주세요.";
}

export default function LoginPage() {
  return (
    <Suspense fallback={<main className="container" />}>
      <LoginInner />
    </Suspense>
  );
}
