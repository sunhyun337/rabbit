import ChatPanel from "@/app/components/ChatPanel";
import LangHelp from "@/app/components/LangHelp";
import StorySynopsis from "@/app/components/StorySynopsis";
import { createClient, hasSupabaseEnv } from "@/lib/supabase/server";

export default async function Home() {
  const gated = hasSupabaseEnv();
  let authed = true;
  let email: string | null = null;
  if (gated) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    authed = !!user;
    email = user?.email ?? null;
  }

  return (
    <>
      <LangHelp />
      <main className="home">
        <section className="home-left">
          {/* ===== 히어로: 민화·수묵 풍 토끼 ===== */}
          <div className="hero-card">
            <div className="hero-illust" aria-hidden="true">
              <svg viewBox="0 0 400 240" preserveAspectRatio="xMidYMid slice">
                <defs>
                  <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stopColor="#f7eed9" />
                    <stop offset="1" stopColor="#efe1c6" />
                  </linearGradient>
                  <linearGradient id="water" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stopColor="#8fd0ce" />
                    <stop offset="1" stopColor="#4a93a0" />
                  </linearGradient>
                  <radialGradient id="sunGlow" cx="0.5" cy="0.5" r="0.5">
                    <stop offset="0" stopColor="#f6b45e" stopOpacity="0.85" />
                    <stop offset="1" stopColor="#f6b45e" stopOpacity="0" />
                  </radialGradient>
                </defs>

                {/* ===== 하늘 ===== */}
                <rect x="0" y="0" width="400" height="140" fill="url(#sky)" />

                {/* 해 */}
                <g className="i-sun-glow">
                  <circle cx="320" cy="66" r="42" fill="url(#sunGlow)" />
                  <circle cx="320" cy="66" r="24" fill="#f0973c" />
                </g>

                {/* 구름 */}
                <g className="i-cloud" fill="#fffdf6">
                  <ellipse cx="82" cy="44" rx="21" ry="11" />
                  <ellipse cx="100" cy="39" rx="16" ry="12" />
                  <ellipse cx="64" cy="48" rx="13" ry="9" />
                </g>
                <g className="i-cloud i-cloud2" fill="#fffdf6" opacity="0.8">
                  <ellipse cx="236" cy="33" rx="18" ry="9" />
                  <ellipse cx="252" cy="30" rx="13" ry="10" />
                </g>

                {/* ===== 산 ===== */}
                <path
                  d="M0,140 C50,108 92,120 132,115 C172,110 202,97 242,103 C282,109 322,99 362,107 C380,111 392,113 400,111 L400,140 Z"
                  fill="#cfe0d2"
                />
                <path
                  d="M0,140 C44,129 94,133 142,127 C188,121 236,133 292,126 C332,121 372,130 400,128 L400,140 Z"
                  fill="#a9ccb8"
                />

                {/* 숲이 있는 언덕 */}
                <path d="M150,140 C168,121 196,116 224,122 C250,127 270,130 288,129 L288,140 Z" fill="#8fbca6" />

                {/* 숲 (나무들) */}
                <g>
                  {/* 뒤쪽(옅은) 나무 */}
                  <g fill="#8dc19a">
                    <circle cx="168" cy="118" r="9" />
                    <circle cx="200" cy="114" r="10" />
                    <circle cx="232" cy="117" r="9" />
                    <circle cx="262" cy="120" r="8" />
                  </g>
                  {/* 앞쪽 나무 — 줄기 */}
                  <g stroke="#7a5a3a" strokeWidth="2.4" strokeLinecap="round">
                    <line x1="178" y1="128" x2="178" y2="120" />
                    <line x1="214" y1="129" x2="214" y2="120" />
                    <line x1="248" y1="129" x2="248" y2="122" />
                  </g>
                  {/* 앞쪽 나무 — 잎 */}
                  <g fill="#5a9c6b">
                    <circle cx="178" cy="115" r="11" />
                    <circle cx="170" cy="120" r="7" />
                    <circle cx="187" cy="120" r="7" />
                    <circle cx="214" cy="116" r="12" />
                    <circle cx="206" cy="121" r="7.5" />
                    <circle cx="223" cy="121" r="7.5" />
                    <circle cx="248" cy="119" r="10" />
                    <circle cx="241" cy="123" r="6.5" />
                    <circle cx="256" cy="123" r="6.5" />
                  </g>
                  {/* 소나무(뾰족) */}
                  <g fill="#3f7d55">
                    <path d="M196,128 l-8,0 l8,-18 l8,18 Z" />
                    <path d="M196,120 l-6,0 l6,-13 l6,13 Z" />
                    <path d="M270,129 l-7,0 l7,-15 l7,15 Z" />
                  </g>
                </g>

                {/* 왼쪽 물가 언덕 + 나무 */}
                <path d="M0,139 C16,134 38,139 50,151 C36,157 14,157 0,155 Z" fill="#8fbca6" />
                <g>
                  {/* 줄기 */}
                  <path d="M24,150 C23,134 24,118 25,106" fill="none" stroke="#7a5a3a" strokeWidth="4.2" strokeLinecap="round" />
                  {/* 가지 */}
                  <path d="M24,122 q-8,-4 -13,-10 M25,116 q8,-4 13,-11" fill="none" stroke="#7a5a3a" strokeWidth="2.4" strokeLinecap="round" />
                  {/* 잎 */}
                  <circle cx="25" cy="98" r="15" fill="#5a9c6b" />
                  <circle cx="13" cy="105" r="9" fill="#6aa877" />
                  <circle cx="37" cy="104" r="9" fill="#4f8f63" />
                  <circle cx="25" cy="108" r="10" fill="#6aa877" />
                </g>

                {/* ===== 물 ===== */}
                <rect x="0" y="140" width="400" height="100" fill="url(#water)" />

                {/* 물결 */}
                <path
                  className="i-wave1"
                  d="M-12,152 q30,-6 60,0 t60,0 t60,0 t60,0 t60,0 t60,0 t60,0"
                  fill="none"
                  stroke="#d9f1ec"
                  strokeWidth="3"
                  strokeLinecap="round"
                  opacity="0.7"
                />
                <path
                  className="i-wave2"
                  d="M-12,163 q30,6 60,0 t60,0 t60,0 t60,0 t60,0 t60,0 t60,0"
                  fill="none"
                  stroke="#ffffff"
                  strokeWidth="2"
                  strokeLinecap="round"
                  opacity="0.45"
                />

                {/* ===== 물 아래 용왕(龍王) ===== */}
                <g className="i-dragon" opacity="0.97">
                  <g transform="translate(348,198) scale(0.68) translate(-348,-198)">
                  {/* 몸통 (굽이치는 용) */}
                  <path
                    d="M378,232 C372,206 348,208 334,198 C318,187 320,172 330,165"
                    fill="none"
                    stroke="#3f9e7f"
                    strokeWidth="21"
                    strokeLinecap="round"
                  />
                  {/* 배(밝은 아랫면) */}
                  <path
                    d="M378,237 C370,214 350,215 338,206"
                    fill="none"
                    stroke="#cdeadb"
                    strokeWidth="7"
                    strokeLinecap="round"
                    opacity="0.85"
                  />
                  {/* 등 비늘/지느러미 */}
                  <g fill="#2f7d63">
                    <path d="M366,214 l5,-7 l5,6 Z" />
                    <path d="M350,206 l5,-7 l5,6 Z" />
                    <path d="M336,194 l5,-7 l5,6 Z" />
                  </g>
                  {/* 머리 */}
                  <g transform="translate(326,160)">
                    {/* 갈기(불꽃) */}
                    <g fill="#e2673f">
                      <path d="M10,2 q10,-2 8,-10 q6,6 0,12 Z" />
                      <path d="M12,-4 q10,-4 7,-12 q6,7 1,14 Z" />
                    </g>
                    {/* 머리 덩어리 */}
                    <path d="M9,8 C-7,5 -15,-5 -8,-14 C-1,-22 13,-19 16,-9 C18,-2 16,6 9,8 Z" fill="#43a081" />
                    {/* 주둥이 */}
                    <ellipse cx="-11" cy="-5" rx="7" ry="5" fill="#43a081" />
                    <path d="M-17,-4 q-5,2 -9,0" fill="none" stroke="#2f7d63" strokeWidth="1.4" strokeLinecap="round" />
                    {/* 콧구멍 */}
                    <circle cx="-16" cy="-7" r="1" fill="#245a48" />
                    {/* 눈 */}
                    <circle cx="0" cy="-9" r="3.2" fill="#fff" />
                    <circle cx="-1" cy="-9" r="1.7" fill="#1e2a26" />
                    {/* 뿔 */}
                    <path d="M6,-16 l3,-9 l3,8 Z" fill="#2f7d63" />
                    <path d="M12,-14 l4,-8 l2,8 Z" fill="#2f7d63" />
                    {/* 수염 */}
                    <path d="M-16,-3 C-30,-5 -42,2 -54,-3" fill="none" stroke="#e2673f" strokeWidth="1.6" strokeLinecap="round" />
                    <path d="M-15,0 C-28,1 -40,8 -50,4" fill="none" stroke="#e2673f" strokeWidth="1.4" strokeLinecap="round" opacity="0.8" />
                    {/* 왕관 (용왕) */}
                    <g transform="translate(2,-15)">
                      <path d="M-8,2 L-9,-6 L-3,-1 L1,-8 L5,-1 L11,-6 L10,2 Z" fill="#edb73f" stroke="#a9781d" strokeWidth="1" strokeLinejoin="round" />
                      <circle cx="1" cy="-3" r="1.2" fill="#c0392b" />
                      <circle cx="-5" cy="0.5" r="0.9" fill="#c0392b" />
                      <circle cx="7" cy="0.5" r="0.9" fill="#c0392b" />
                    </g>
                  </g>
                  </g>
                </g>

                {/* 물방울 */}
                <circle className="i-bubble" cx="300" cy="150" r="3" fill="#eafaf6" opacity="0.6" />
                <circle className="i-bubble b2" cx="314" cy="156" r="2.2" fill="#eafaf6" opacity="0.6" />
                <circle className="i-bubble b3" cx="292" cy="162" r="2.6" fill="#eafaf6" opacity="0.6" />

                {/* ===== 자라가 토끼를 태우고 숲↔물을 오가는 여정 ===== */}
                {/* 위치용 그룹(숲 위 대기 자리) + 애니메이션용 그룹 분리 */}
                <g transform="translate(208,118)">
                  <g className="i-journey">
                    <g transform="scale(1.35)">
                    {/* 자라 (왼쪽을 향함) */}
                    <g>
                      {/* 다리 */}
                      <g fill="#6a9e52">
                        <ellipse cx="-12" cy="18" rx="5" ry="3" transform="rotate(20 -12 18)" />
                        <ellipse cx="11" cy="18" rx="5" ry="3" transform="rotate(-20 11 18)" />
                        <ellipse cx="13" cy="4" rx="4.5" ry="2.8" transform="rotate(-25 13 4)" />
                      </g>
                      {/* 목+머리 */}
                      <path d="M-15,8 q-10,-1 -15,-6" fill="none" stroke="#6a9e52" strokeWidth="5.5" strokeLinecap="round" />
                      <circle cx="-30" cy="0" r="5" fill="#79ad60" />
                      <circle cx="-32" cy="-1" r="1.3" fill="#1f2a22" />
                      {/* 등딱지 */}
                      <ellipse cx="0" cy="9" rx="20" ry="12" fill="#3f7e4e" stroke="#275538" strokeWidth="1.6" />
                      <ellipse cx="0" cy="7" rx="14" ry="7" fill="#56a068" opacity="0.8" />
                      <path d="M-20,9 H20 M0,-3 V21 M-11,1 L-6,19 M11,1 L6,19 M-16,14 H16" fill="none" stroke="#275538" strokeWidth="1" opacity="0.7" />
                      {/* 꼬리 */}
                      <path d="M19,12 l7,3 l-6,2 Z" fill="#6a9e52" />
                    </g>
                    {/* 등에 탄 토끼 (주인공) */}
                    <g>
                      {/* 귀 */}
                      <ellipse cx="-2" cy="-27" rx="3.2" ry="12" transform="rotate(-10 -2 -27)" fill="#fdfdfb" stroke="#dcd4c4" strokeWidth="0.9" />
                      <ellipse cx="7" cy="-27" rx="3.2" ry="12" transform="rotate(9 7 -27)" fill="#fdfdfb" stroke="#dcd4c4" strokeWidth="0.9" />
                      <ellipse cx="-2" cy="-26" rx="1.4" ry="7.5" transform="rotate(-10 -2 -26)" fill="#f3c9cf" />
                      <ellipse cx="7" cy="-26" rx="1.4" ry="7.5" transform="rotate(9 7 -26)" fill="#f3c9cf" />
                      {/* 몸 */}
                      <ellipse cx="2" cy="-7" rx="12" ry="11" fill="#fdfdfb" stroke="#dcd4c4" strokeWidth="0.9" />
                      {/* 머리 */}
                      <circle cx="3" cy="-19" r="8.5" fill="#fdfdfb" stroke="#dcd4c4" strokeWidth="0.9" />
                      {/* 얼굴 (왼쪽, 진행 방향) */}
                      <circle cx="-1.5" cy="-19" r="1.6" fill="#2b2b2b" />
                      <path d="M-6,-17 l-4,-1 l4,2 Z" fill="#f3a0a8" />
                      <path d="M-6,-15 q-3,2 -6,1" fill="none" stroke="#b9a98f" strokeWidth="0.8" strokeLinecap="round" />
                    </g>
                    </g>
                  </g>
                </g>
              </svg>
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
                  <p className="hero-sub">
                    한국어능력 4급 학습자와 함께 고전 『토끼전』으로 <b>말하기</b>를
                    연습하는 AI 에이전트
                  </p>
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
                <StorySynopsis label="📖 줄거리" />
                <a className="btn big" href="/chat">
                  💬 대화 연습
                </a>
                <a className="btn ghost big" href="/interview">
                  🎙️ 인터뷰
                </a>
                <a className="btn ghost big" href="/quiz">
                  🧩 퀴즈
                </a>
                <a className="btn ghost big" href="/game">
                  🎮 게임
                </a>
              </div>
            </div>
          </div>
        </section>

        <aside className="home-right">
          <ChatPanel variant="side" authed={authed} />
        </aside>
      </main>
    </>
  );
}
