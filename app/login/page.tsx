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
          options: {
            emailRedirectTo:
              typeof window !== "undefined"
                ? `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`
                : undefined,
          },
        });
        if (error) throw error;
        if (data.session) {
          // 이메일 확인이 꺼져 있으면 바로 로그인됨
          router.push(next);
          router.refresh();
        } else {
          setMsg(
            "회원가입 신청이 접수됐어요. 이메일로 온 확인 링크를 눌러 가입을 완료해 주세요.",
          );
          setMode("login");
        }
      }
    } catch (e) {
      const raw = e instanceof Error ? e.message : "";
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
  const s = raw.toLowerCase();
  if (s.includes("invalid login")) return "아이디 또는 비밀번호가 올바르지 않아요.";
  if (s.includes("already registered") || s.includes("already been registered"))
    return "이미 가입된 이메일이에요. 로그인해 주세요.";
  if (s.includes("password")) return "비밀번호를 확인해 주세요. (6자 이상)";
  if (s.includes("email")) return "이메일 주소를 확인해 주세요.";
  return "잠시 후 다시 시도해 주세요.";
}

export default function LoginPage() {
  return (
    <Suspense fallback={<main className="container" />}>
      <LoginInner />
    </Suspense>
  );
}
