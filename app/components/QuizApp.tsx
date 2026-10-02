"use client";

import { useState } from "react";
import {
  ALL_QUIZ,
  CHESTS,
  POINTS_FIRST_TRY,
  POINTS_RETRY,
  normalizeAnswer,
  type QuizQuestion,
} from "@/lib/story/quizSets";
import { getItem, addEarnedItem, type ItemId } from "@/lib/story/items";

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
  const [solved, setSolved] = useState(false);
  const [triedWrong, setTriedWrong] = useState(false);
  const [wrongPicks, setWrongPicks] = useState<number[]>([]); // mc/ox 틀린 선택
  const [saText, setSaText] = useState("");
  const [saWrong, setSaWrong] = useState(false);

  const [openedChests, setOpenedChests] = useState<string[]>([]);

  const cur = items[idx];

  function resetPerQuestion() {
    setSolved(false);
    setTriedWrong(false);
    setWrongPicks([]);
    setSaText("");
    setSaWrong(false);
  }

  function start() {
    setItems(ALL_QUIZ.map(prepare));
    setIdx(0);
    setPoints(0);
    setCorrectCount(0);
    setOpenedChests([]);
    resetPerQuestion();
    setPhase("playing");
  }

  // 보물상자 열기 → 아이템 획득(localStorage 저장) → 게임에서 장착 가능
  function openChest(item: ItemId) {
    setOpenedChests((o) => (o.includes(item) ? o : [...o, item]));
    addEarnedItem(item);
  }

  function awardAndSolve() {
    setPoints((p) => p + (triedWrong ? POINTS_RETRY : POINTS_FIRST_TRY));
    setCorrectCount((c) => c + 1);
    setSolved(true);
  }

  function pickMC(i: number) {
    if (solved || !cur?.options) return;
    if (i === cur.correctIndex) awardAndSolve();
    else {
      setTriedWrong(true);
      setWrongPicks((w) => (w.includes(i) ? w : [...w, i]));
    }
  }

  function pickOX(val: boolean) {
    if (solved || cur?.base.type !== "ox") return;
    if (val === cur.base.answerBool) awardAndSolve();
    else {
      setTriedWrong(true);
      const k = val ? 0 : 1; // O=0, X=1
      setWrongPicks((w) => (w.includes(k) ? w : [...w, k]));
    }
  }

  function submitSA() {
    if (solved || cur?.base.type !== "sa") return;
    const ans = normalizeAnswer(saText);
    if (!ans) return;
    const ok = (cur.base.answerText ?? []).some(
      (a) => normalizeAnswer(a) === ans,
    );
    if (ok) awardAndSolve();
    else {
      setTriedWrong(true);
      setSaWrong(true);
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

  const nextChest = CHESTS.find((c) => points < c.threshold);

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
            OX·객관식·주관식이 섞여 나와요. 틀려도 다시 고를 수 있어요!
          </p>
          <ul className="quiz-intro-points">
            <li>⭐ 한 번에 맞히면 +{POINTS_FIRST_TRY}점, 다시 맞히면 +{POINTS_RETRY}점</li>
            <li>🎁 모은 점수로 보물상자를 열면 <b>게임 아이템</b>을 얻어요!</li>
            <li>🎮 얻은 아이템을 게임에서 장착하면 토끼가 더 강해져요</li>
          </ul>
          <div className="quiz-chests preview">
            {CHESTS.map((c) => {
              const it = getItem(c.item)!;
              return (
                <div key={c.item} className="quiz-chest locked">
                  <span className="quiz-chest-icon">{it.icon}</span>
                  <span className="quiz-chest-name">{it.name}</span>
                  <span className="quiz-chest-th">{c.threshold}점</span>
                </div>
              );
            })}
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
    const unlockedCount = CHESTS.filter((c) => points >= c.threshold).length;
    const stars = unlockedCount; // 0~5 (열 수 있는 상자 수)
    return (
      <div className="quiz-wrap">
        <QuizHeader points={points} />
        <div className="quiz-result">
          <div className="quiz-result-stars">{"⭐".repeat(stars) || "🙂"}</div>
          <h2>퀴즈 완료!</h2>
          <p className="quiz-result-score">
            {ALL_QUIZ.length}문제 중 <b>{correctCount}</b>개 정답 · <b>{points}</b>점
          </p>
          <p className="quiz-result-sub">
            보물상자를 열어 <b>게임 아이템</b>을 얻으세요! (게임에서 장착할 수 있어요)
          </p>
          <div className="quiz-chests">
            {CHESTS.map((c) => {
              const it = getItem(c.item)!;
              const unlocked = points >= c.threshold;
              const opened = openedChests.includes(c.item);
              return (
                <button
                  key={c.item}
                  className={`quiz-chest ${unlocked ? "unlocked" : "locked"} ${opened ? "opened" : ""}`}
                  disabled={!unlocked || opened}
                  onClick={() => openChest(c.item)}
                >
                  <span className="quiz-chest-icon">
                    {opened ? it.icon : unlocked ? "🎁" : "🔒"}
                  </span>
                  <span className="quiz-chest-name">
                    {opened ? `${it.icon} ${it.name}` : "보물상자"}
                  </span>
                  {opened ? (
                    <span className="quiz-chest-reward">{it.desc}</span>
                  ) : (
                    <span className="quiz-chest-th">
                      {unlocked ? "눌러서 열기!" : `${c.threshold}점 필요`}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
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
  const progress = ((idx + (solved ? 1 : 0)) / total) * 100;
  const type = cur.base.type;

  return (
    <div className="quiz-wrap">
      <QuizHeader points={points} nextChest={nextChest} />

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
              const cls = solved && isCorrect ? "correct" : isWrong ? "wrong" : "";
              return (
                <button
                  key={i}
                  className={`quiz-opt ${cls}`}
                  onClick={() => pickMC(i)}
                  disabled={solved || isWrong}
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
              const cls = solved && isCorrect ? "correct" : isWrong ? "wrong" : "";
              return (
                <button
                  key={label}
                  className={`quiz-ox-btn ${cls}`}
                  onClick={() => pickOX(val)}
                  disabled={solved || isWrong}
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
              disabled={solved}
            />
            {!solved && (
              <button className="btn" onClick={submitSA} disabled={!saText.trim()}>
                확인
              </button>
            )}
          </div>
        )}

        {!solved && triedWrong && (
          <p className="quiz-retry">앗, 틀렸어요. 다시 골라 보세요! 🙂</p>
        )}

        {solved && (
          <div className="quiz-feedback">
            <p className="quiz-correct-msg">
              정답이에요! +{triedWrong ? POINTS_RETRY : POINTS_FIRST_TRY}점
            </p>
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

function QuizHeader({
  points,
  nextChest,
}: {
  points: number;
  nextChest?: { threshold: number } | undefined;
}) {
  return (
    <header className="quiz-header">
      <a href="/" className="quiz-back">
        ← 홈
      </a>
      <span className="quiz-title">🧩 토끼전 퀴즈</span>
      <span className="quiz-points" title={`최대 ${MAX_POINTS}점`}>
        🪙 {points}점
        {nextChest && (
          <small>
            {" "}
            · 다음 상자까지 {nextChest.threshold - points}점
          </small>
        )}
      </span>
    </header>
  );
}
