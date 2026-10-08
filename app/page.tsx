import StorySynopsis from "@/app/components/StorySynopsis";
import { hasSupabaseEnv } from "@/lib/supabase/server";
import { getViewer } from "@/lib/auth/viewer";

export default async function Home() {
  const gated = hasSupabaseEnv();
  const { user, isTeacher } = await getViewer();
  const authed = !gated || !!user;
  const email = user?.email ?? null;

  return (
    <>
      <main className="home">
        <section className="home-left">
          {/* ===== 히어로: 토끼전 수채화 일러스트 (액자형) ===== */}
          <div className="hero-card">
            <div className="hero-illust">
              <img
                className="hero-img"
                src="/assets/rabbit_palace.webp"
                alt="토끼가 자라를 타고 용궁으로 가는 『토끼전』 수채화 그림"
              />
            </div>

            <div className="hero-copy">
              <div className="hero-top">
                <div className="hero-titlewrap">
                  <h1>
                    토끼전 말하기 연습
                    <span className="seal" aria-hidden="true">
                      兎
                    </span>
                  </h1>
                </div>
                {gated && authed ? (
                  <div className="acct">
                    <span className="acct-email">{email}</span>
                    <form action="/auth/signout" method="post">
                      <button className="linklike" type="submit">
                        로그아웃
                      </button>
                    </form>
                  </div>
                ) : (
                  <a className="btn small" href="/login">
                    로그인
                    <br />
                    회원가입
                  </a>
                )}
              </div>

              <div className="home-btns">
                <StorySynopsis label="📖 줄거리" className="btn big" />
                <a className="btn big" href="/practice">
                  🗣️ 말하기 연습
                </a>
                <a className="btn big" href="/quiz">
                  🧩 퀴즈
                </a>
                <a className="btn big" href="/game">
                  🎮 게임
                </a>
                <a className="btn big" href="/remix">
                  ✨ 이야기 바꾸기
                </a>
                <a className="btn big" href="/world">
                  🌍 다른 나라 이야기
                </a>
                {isTeacher && (
                  <a className="btn big dash-btn" href="/dashboard">
                    📊 교사 대시보드
                  </a>
                )}
              </div>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
