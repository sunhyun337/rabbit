export default function Home() {
  const principles = [
    "서사 이해 — 사건의 흐름과 인물의 목표를 단계적으로 이해",
    "언어·내용 통합 비계 — 어휘를 맥락과 연결, 발화 의미 먼저 확인",
    "인물 관점 탐구 — 토끼·자라·용왕의 가치를 다양한 관점에서",
    "근거 기반 주제 추론 — 주제를 스스로 근거로 추론",
    "상호문화 가치 성찰 — 내 문화와 비교하며 성찰",
    "작품 재구성 — 결말·선택을 바꿔 의미를 재구성",
  ];

  return (
    <main className="container">
      <section className="hero">
        <h1>🐰 토끼전 말하기 연습</h1>
        <p>한국어능력 4급 학습자를 위한 『토끼전』 말하기 도우미 AI 에이전트</p>
        <a className="btn" href="/chat">
          대화 시작하기
        </a>
      </section>

      <section className="card">
        <h2>이렇게 연습해요 (6단계 설계원리)</h2>
        <ul className="principles">
          {principles.map((p, i) => (
            <li key={i}>
              <strong>{i + 1}.</strong> {p}
            </li>
          ))}
        </ul>
        <p style={{ color: "#777", fontSize: "0.9rem" }}>
          * 이 에이전트는 정답을 먼저 알려주지 않고, 질문을 통해 스스로 생각하고
          말하도록 돕습니다.
        </p>
      </section>
    </main>
  );
}
