"use client";

import { useState } from "react";
import {
  ALL_QUIZ,
  CHEST_BANDS,
  rewardBand,
  POINTS_FIRST_TRY,
  POINTS_SECOND_TRY,
  PENALTY_WRONG,
  normalizeAnswer,
  type QuizQuestion,
} from "@/lib/story/quizSets";
import { getItem, addEarnedItem } from "@/lib/story/items";

interface Prepared {
  base: QuizQuestion;
  options?: string[]; // mc: 섞인 보기
  correctIndex?: number; // mc: 섞인 보기에서 정답 위치
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function prepare(q: QuizQuestion): Prepared {
  if (q.type === "mc" && q.options) {
    const correct = q.options[0];
    const options = shuffle(q.options);
    return { base: q, options, correctIndex: options.indexOf(correct) };
  }
  return { base: q };
}

const TYPE_LABEL: Record<QuizQuestion["type"], string> = {
  ox: "OX",
  mc: "객관식",
  sa: "주관식",
};

const MAX_POINTS = ALL_QUIZ.length * POINTS_FIRST_TRY;

export default function QuizApp() {
  const [phase, setPhase] = useState<"intro" | "playing" | "result">("intro");
  const [items, setItems] = useState<Prepared[]>([]);
  const [idx, setIdx] = useState(0);
  const [points, setPoints] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);

  // 현재 문제 상태
  const [solved, setSolved] = useState(false); // 정답 처리됨
  const [failed, setFailed] = useState(false); // 못 맞히고 넘어감(정답 공개)
  const [gained, setGained] = useState(0); // 이 문제에서 얻은(또는 잃은) 점수
  const [wrongPicks, setWrongPicks] = useState<number[]>([]); // mc/ox 틀린 선택
  const [saText, setSaText] = useState("");
  const [saWrong, setSaWrong] = useState(false);
  const [saAttempts, setSaAttempts] = useState(0);

  const [chestOpened, setChestOpened] = useState(false);

  const cur = items[idx];
  const resolved = solved || failed;

  function resetPerQuestion() {
    setSolved(false);
    setFailed(false);
    setGained(0);
    setWrongPicks([]);
    setSaText("");
    setSaWrong(false);
    setSaAttempts(0);
  }

  function start() {
    setItems(ALL_QUIZ.map(prepare));
    setIdx(0);
    setPoints(0);
    setCorrectCount(0);
    setChestOpened(false);
    resetPerQuestion();
    setPhase("playing");
  }

  function finishCorrect(g: number) {
    setPoints((p) => p + g);
    setCorrectCount((c) => c + 1);
    setGained(g);
    setSolved(true);
  }

  function finishFailed(delta: number) {
    if (delta !== 0) setPoints((p) => p + delta);
    setGained(delta);
    setFailed(true);
  }

  // 객관식: 1번째 +10, 2번째 +5, 3번째도 틀리면 -5 후 넘어감
  function pickMC(i: number) {
    if (resolved || !cur?.options) return;
    if (i === cur.correctIndex) {
      const g =
        wrongPicks.length === 0
          ? POINTS_FIRST_TRY
          : wrongPicks.length === 1
            ? POINTS_SECOND_TRY
            : 0;
      finishCorrect(g);
    } else {
      const nextWrong = wrongPicks.includes(i) ? wrongPicks : [...wrongPicks, i];
      setWrongPicks(nextWrong);
      if (nextWrong.length >= 3) finishFailed(-PENALTY_WRONG); // 3번째도 틀림
    }
  }

  // OX: 맞히면 +10, 틀리면 0점으로 바로 넘어감(재시도 없음)
  function pickOX(val: boolean) {
    if (resolved || cur?.base.type !== "ox") return;
    if (val === cur.base.answerBool) finishCorrect(POINTS_FIRST_TRY);
    else {
      setWrongPicks([val ? 0 : 1]);
      finishFailed(0);
    }
  }

  // 주관식: 1번째 +10, 2번째 +5, 2번 틀리면 0점으로 넘어감
  function submitSA() {
    if (resolved || cur?.base.type !== "sa") return;
    const ans = normalizeAnswer(saText);
    if (!ans) return;
    const ok = (cur.base.answerText ?? []).some(
      (a) => normalizeAnswer(a) === ans,
    );
    if (ok) finishCorrect(saAttempts === 0 ? POINTS_FIRST_TRY : POINTS_SECOND_TRY);
    else {
      const n = saAttempts + 1;
      setSaAttempts(n);
      setSaWrong(true);
      if (n >= 2) finishFailed(0); // 2번 틀리면 넘어감
    }
  }

  function next() {
    if (idx + 1 >= items.length) {
      setPhase("result");
      return;
    }
    setIdx(idx + 1);
    resetPerQuestion();
  }

  // ===== 시작 화면 =====
  if (phase === "intro") {
    return (
      <div className="quiz-wrap">
        <QuizHeader points={points} />
        <div className="quiz-intro">
          <div className="quiz-intro-emoji">🧩</div>
          <h2>토끼전 퀴즈</h2>
          <p className="quiz-intro-lead">
            단어 퀴즈 10개 + 내용 퀴즈 10개, 모두 20문제예요.
            <br />
            OX·객관식·주관식이 섞여 나와요.
          </p>
          <ul className="quiz-intro-points">
            <li>⭐ 1번에 맞히면 +{POINTS_FIRST_TRY}점, 2번째에 맞히면 +{POINTS_SECOND_TRY}점</li>
            <li>📝 객관식은 3번째도 틀리면 −{PENALTY_WRONG}점, OX·주관식은 틀리면 점수 없이 넘어가요</li>
            <li>🎁 최종 점수에 맞는 <b>보물상자 1개</b>를 열어 게임 아이템을 얻어요!</li>
          </ul>
          <div className="quiz-bands">
            {CHEST_BANDS.map((b) => {
              const it = getItem(b.item)!;
              return (
                <div key={b.item} className="quiz-band">
                  <span className="quiz-band-range">{b.range}</span>
                  <span className="quiz-band-item">
                    {it.icon} {it.name}
                  </span>
                </div>
              );
            })}
            <div className="quiz-band dim">
              <span className="quiz-band-range">60점 미만</span>
              <span className="quiz-band-item">상자 없음 — 다시 도전!</span>
            </div>
          </div>
          <button className="btn big" onClick={start}>
            퀴즈 시작하기
          </button>
        </div>
      </div>
    );
  }

  // ===== 결과 화면 =====
  if (phase === "result") {
    const band = rewardBand(points);
    const bandIndex = band ? CHEST_BANDS.indexOf(band) : -1;
    const stars = band ? CHEST_BANDS.length - bandIndex : 0; // 1~5
    const item = band ? getItem(band.item) : undefined;
    return (
      <div className="quiz-wrap">
        <QuizHeader points={points} />
        <div className="quiz-result">
          <div className="quiz-result-stars">{"⭐".repeat(stars) || "🙂"}</div>
          <h2>퀴즈 완료!</h2>
          <p className="quiz-result-score">
            {ALL_QUIZ.length}문제 중 <b>{correctCount}</b>개 정답 · <b>{points}</b>점
          </p>

          {band && item ? (
            <>
              <p className="quiz-result-sub">
                <b>{band.range}</b> — 보물상자를 열어 게임 아이템을 얻으세요!
              </p>
              <div className="quiz-chests">
                <button
                  className={`quiz-chest unlocked ${chestOpened ? "opened" : ""}`}
                  disabled={chestOpened}
                  onClick={() => {
                    setChestOpened(true);
                    addEarnedItem(band.item);
                  }}
                >
                  <span className="quiz-chest-icon">
                    {chestOpened ? item.icon : "🎁"}
                  </span>
                  <span className="quiz-chest-name">
                    {chestOpened ? `${item.icon} ${item.name}` : "보물상자"}
                  </span>
                  <span className="quiz-chest-reward">
                    {chestOpened ? item.desc : "눌러서 열기!"}
                  </span>
                </button>
              </div>
            </>
          ) : (
            <p className="quiz-result-sub">
              앗! <b>60점</b>을 넘으면 보물상자를 열 수 있어요. 다시 도전해 볼까요?
            </p>
          )}

          <div className="quiz-result-btns">
            <button className="btn big" onClick={start}>
              다시 풀기
            </button>
            <a className="btn big" href="/game">
              🎮 게임에서 쓰기
            </a>
            <a className="btn ghost big" href="/">
              홈으로
            </a>
          </div>
        </div>
      </div>
    );
  }

  // ===== 문제 풀이 화면 =====
  const total = items.length;
  const progress = ((idx + (resolved ? 1 : 0)) / total) * 100;
  const type = cur.base.type;
  const showRetry =
    !resolved && (wrongPicks.length > 0 || saWrong);

  return (
    <div className="quiz-wrap">
      <QuizHeader points={points} />

      <div className="quiz-progress">
        <div className="quiz-progress-bar" style={{ width: `${progress}%` }} />
      </div>
      <div className="quiz-meta">
        <span className={`quiz-badge cat-${cur.base.category}`}>
          {cur.base.category === "word" ? "단어" : "내용"}
        </span>
        <span className="quiz-badge type">{TYPE_LABEL[type]}</span>
        <span className="quiz-count">
          {idx + 1} / {total}
        </span>
      </div>

      <div className="quiz-card">
        <p className="quiz-q">{cur.base.q}</p>

        {type === "mc" && (
          <div className="quiz-options">
            {cur.options!.map((opt, i) => {
              const isCorrect = i === cur.correctIndex;
              const isWrong = wrongPicks.includes(i);
              const cls = resolved && isCorrect ? "correct" : isWrong ? "wrong" : "";
              return (
                <button
                  key={i}
                  className={`quiz-opt ${cls}`}
                  onClick={() => pickMC(i)}
                  disabled={resolved || isWrong}
                >
                  {opt}
                </button>
              );
            })}
          </div>
        )}

        {type === "ox" && (
          <div className="quiz-ox">
            {[
              { val: true, label: "⭕ 맞아요", k: 0 },
              { val: false, label: "❌ 아니에요", k: 1 },
            ].map(({ val, label, k }) => {
              const isCorrect = cur.base.answerBool === val;
              const isWrong = wrongPicks.includes(k);
              const cls = resolved && isCorrect ? "correct" : isWrong ? "wrong" : "";
              return (
                <button
                  key={label}
                  className={`quiz-ox-btn ${cls}`}
                  onClick={() => pickOX(val)}
                  disabled={resolved || isWrong}
                >
                  {label}
                </button>
              );
            })}
          </div>
        )}

        {type === "sa" && (
          <div className="quiz-sa">
            <input
              className={`quiz-sa-input ${saWrong ? "wrong" : ""}`}
              value={saText}
              onChange={(e) => {
                setSaText(e.target.value);
                setSaWrong(false);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") submitSA();
              }}
              placeholder="정답을 입력하세요"
              disabled={resolved}
            />
            {!resolved && (
              <button className="btn" onClick={submitSA} disabled={!saText.trim()}>
                확인
              </button>
            )}
          </div>
        )}

        {showRetry && (
          <p className="quiz-retry">앗, 틀렸어요. 다시 골라 보세요! 🙂</p>
        )}

        {resolved && (
          <div className="quiz-feedback">
            {solved ? (
              <p className="quiz-correct-msg">
                정답이에요!{gained > 0 ? ` +${gained}점` : " (이번엔 점수 없이 통과)"}
              </p>
            ) : (
              <p className="quiz-wrong-msg">
                아쉬워요. {type === "sa" && `정답: ${cur.base.answerText?.[0]} · `}
                {gained < 0 ? `${gained}점` : "점수 없이 넘어가요"}
              </p>
            )}
            <p className="quiz-explain">{cur.base.explain}</p>
            <button className="btn big" onClick={next}>
              {idx + 1 >= total ? "결과 보기" : "다음 문제"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function QuizHeader({ points }: { points: number }) {
  return (
    <header className="quiz-header">
      <a href="/" className="quiz-back">
        ← 홈
      </a>
      <span className="quiz-title">🧩 토끼전 퀴즈</span>
      <span className="quiz-points" title={`최대 ${MAX_POINTS}점`}>
        🪙 {points}점
      </span>
    </header>
  );
}
