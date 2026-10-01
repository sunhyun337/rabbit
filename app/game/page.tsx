"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { QUIZ, type QuizItem } from "@/lib/story/quiz";

/**
 * 『토끼전』 경주 — 토끼(플레이어) vs 자라(AI). 의인화·회화풍.
 * 긴 스테이지를 ←→ 로 걷고 ↑/Space 로 점프하며 결승선까지 간다.
 * 배경은 숲 → 용궁(바다) → 숲 (바다 진입 시 '풍덩').
 * 중간 질문(퀴즈):
 *  - 정답 → 자라를 뒤로 날려버리고 자라 속도 저하 🐢💨
 *  - 오답 → 내 속도가 잠시 느려짐 (길을 막는 용왕 없음)
 * 사건 이해 중심(원리1), 주제·교훈은 묻지 않음(원리4).
 */

const VW = 900;
const VH = 460;
const GROUND_Y = 384;
const GOAL = 9000;

const SEA_START = 3000;
const SEA_END = 6000;

const RUN = 3.5;
const ACCEL = 0.6;
const TURTLE = 2.0;

const PW = 28;
const PH = 48;

// 떠 있는 발판(반딧불 수집용) — 점프의 재미
const PLATFORMS = [
  { x: 820, y: 300, w: 120 },
  { x: 1500, y: 268, w: 120 },
  { x: 2300, y: 296, w: 120 },
  { x: 3500, y: 300, w: 130 },
  { x: 4400, y: 264, w: 130 },
  { x: 5200, y: 300, w: 130 },
  { x: 6400, y: 296, w: 120 },
  { x: 7300, y: 268, w: 120 },
  { x: 8100, y: 300, w: 120 },
];

// 질문 관문(12개 — 한 판에 10개 이상)
const GATES: number[] = [];
for (let x = 640; x < 8700; x += 700) GATES.push(x);

// 뛰어넘는 장애물: 물웅덩이(느려짐) · 작은 산(막힘) · 바위(바닷속, 막힘)
type ObType = "puddle" | "mound" | "rock";
const OB_W: Record<ObType, number> = { puddle: 66, mound: 46, rock: 40 };
const OB_H: Record<ObType, number> = { puddle: 0, mound: 36, rock: 30 };
const OB_DEFS: { x: number; type: ObType }[] = [];
for (let x = 420; x < GOAL - 320; x += 420) {
  if (x < 360) continue;
  if (GATES.some((g) => Math.abs(g - x) < 110)) continue;
  if (PLATFORMS.some((p) => x > p.x - 50 && x < p.x + p.w + 50)) continue;
  // 구간 경계(숲↔바다) 주변은 비워서 전환이 항상 뚫리게 한다
  if (Math.abs(x - SEA_START) < 240 || Math.abs(x - SEA_END) < 240) continue;
  const inSea = x >= SEA_START && x < SEA_END;
  const type: ObType = inSea ? "rock" : Math.floor(x / 420) % 2 === 0 ? "puddle" : "mound";
  OB_DEFS.push({ x, type });
}

type Phase = "intro" | "running" | "quiz" | "feedback" | "win" | "lose";

interface Feedback {
  correct: boolean;
  answerText: string;
  explain: string;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function zoneName(x: number) {
  if (x < SEA_START) return "🌲 숲 (육지)";
  if (x < SEA_END) return "🌊 용궁 (바닷속)";
  return "🌲 숲 (육지)";
}

export default function GamePage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const [phase, setPhase] = useState<Phase>("intro");
  const [quiz, setQuiz] = useState<QuizItem | null>(null);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [fs, setFs] = useState(false);

  const phaseRef = useRef<Phase>("intro");
  const keys = useRef<Record<string, boolean>>({});
  const player = useRef({ x: 40, y: GROUND_Y - PH, vx: 0, vy: 0, onGround: true, face: 1, anim: 0 });
  const prevX = useRef(40);
  const turtleX = useRef(60);
  const turtleMul = useRef(1);
  const speedMul = useRef(1);
  const slowTimer = useRef(0);
  const obstaclesRef = useRef<{ x: number; type: ObType; cleared: boolean }[]>([]);
  const fireflies = useRef<{ x: number; y: number; taken: boolean }[]>([]);
  const sparkles = useRef<{ x: number; y: number; vx: number; vy: number; life: number }[]>([]);
  const splash = useRef<{ x: number; y: number; vx: number; vy: number; life: number }[]>([]);
  const splashText = useRef(0);
  const gates = useRef(GATES.map((x) => ({ x, asked: false })));
  const quizOrder = useRef<QuizItem[]>([]);
  const gateCount = useRef(0);
  const camX = useRef(0);
  const tRef = useRef(0);
  const rafRef = useRef<number | null>(null);

  const rMarkRef = useRef<HTMLDivElement>(null);
  const tMarkRef = useRef<HTMLDivElement>(null);
  const speedRef = useRef<HTMLSpanElement>(null);

  const resetGame = useCallback(() => {
    player.current = { x: 40, y: GROUND_Y - PH, vx: 0, vy: 0, onGround: true, face: 1, anim: 0 };
    prevX.current = 40;
    turtleX.current = 60;
    turtleMul.current = 1;
    speedMul.current = 1;
    slowTimer.current = 0;
    obstaclesRef.current = OB_DEFS.map((o) => ({ ...o, cleared: false }));
    fireflies.current = PLATFORMS.map((p) => ({ x: p.x + p.w / 2, y: p.y - 22, taken: false }));
    sparkles.current = [];
    splash.current = [];
    splashText.current = 0;
    gates.current = GATES.map((x) => ({ x, asked: false }));
    quizOrder.current = shuffle(QUIZ);
    gateCount.current = 0;
    camX.current = 0;
  }, []);

  const startGame = useCallback(() => {
    resetGame();
    setQuiz(null);
    setFeedback(null);
    phaseRef.current = "running";
    setPhase("running");
  }, [resetGame]);

  const answerQuiz = useCallback(
    (idx: number) => {
      const item = quiz;
      if (!item) return;
      const correct = idx === item.answer;
      if (correct) {
        // 토끼만 살짝 빨라짐 — 자라는 건드리지 않는다
        speedMul.current *= 1.06;
      } else {
        // 자라가 점점 빨라져서 아슬아슬해진다
        turtleMul.current *= 1.14;
        slowTimer.current = 110;
      }
      setFeedback({ correct, answerText: item.options[item.answer], explain: item.explain });
      phaseRef.current = "feedback";
      setPhase("feedback");
    },
    [quiz],
  );

  const resume = useCallback(() => {
    setFeedback(null);
    setQuiz(null);
    phaseRef.current = "running";
    setPhase("running");
  }, []);

  const toggleFullscreen = useCallback(() => {
    const el = stageRef.current;
    if (!el) return;
    if (!document.fullscreenElement) el.requestFullscreen?.().catch(() => {});
    else document.exitFullscreen?.().catch(() => {});
  }, []);

  useEffect(() => {
    const onFs = () => setFs(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, []);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      const k = e.key;
      if (["ArrowUp", "ArrowLeft", "ArrowRight", " ", "Enter"].includes(k)) e.preventDefault();
      if (k === "Enter") {
        const p = phaseRef.current;
        if (p === "intro" || p === "win" || p === "lose") startGame();
        else if (p === "feedback") resume();
        return;
      }
      keys.current[k] = true;
    };
    const up = (e: KeyboardEvent) => {
      keys.current[e.key] = false;
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, [startGame, resume]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const spawnSplash = (x: number, big: boolean) => {
      const n = big ? 24 : 12;
      for (let i = 0; i < n; i++)
        splash.current.push({
          x,
          y: GROUND_Y - 8,
          vx: (Math.random() - 0.5) * (big ? 8 : 4),
          vy: -Math.random() * (big ? 10 : 6) - 2,
          life: 32 + Math.random() * 20,
        });
      if (big) splashText.current = 70;
    };

    const update = () => {
      if (phaseRef.current !== "running") return;
      const p = player.current;
      const inSea = p.x >= SEA_START && p.x < SEA_END;
      const grav = inSea ? 0.4 : 0.72;
      const jumpV = inSea ? -10.6 : -13.2;

      const left = keys.current["ArrowLeft"] || keys.current["a"];
      const right = keys.current["ArrowRight"] || keys.current["d"];
      const jump = keys.current["ArrowUp"] || keys.current[" "] || keys.current["w"];

      const footX0 = p.x + PW / 2;
      let inPuddle = false;
      if (p.onGround)
        for (const o of obstaclesRef.current)
          if (o.type === "puddle" && footX0 > o.x && footX0 < o.x + OB_W.puddle) {
            inPuddle = true;
            break;
          }
      const maxRun =
        RUN * speedMul.current * (slowTimer.current > 0 ? 0.5 : 1) * (inPuddle ? 0.5 : 1);
      if (right && !left) {
        p.vx = Math.min(maxRun, p.vx + ACCEL);
        p.face = 1;
      } else if (left && !right) {
        p.vx = Math.max(-maxRun * 0.7, p.vx - ACCEL);
        p.face = -1;
      } else {
        p.vx *= 0.8;
        if (Math.abs(p.vx) < 0.05) p.vx = 0;
      }
      if (jump && p.onGround) {
        p.vy = jumpV;
        p.onGround = false;
      }

      p.vy += grav;
      if (p.vy > (inSea ? 9 : 17)) p.vy = inSea ? 9 : 17;

      prevX.current = p.x;
      let newX = p.x + p.vx;
      for (const o of obstaclesRef.current) {
        if (o.type === "puddle") continue;
        const ow = OB_W[o.type];
        const otop = GROUND_Y - OB_H[o.type];
        if (newX + PW > o.x && p.x < o.x + ow && p.y + PH > otop + 6) newX = o.x - PW;
      }
      p.x = Math.max(8, Math.min(GOAL + 40, newX));
      if (inPuddle && tRef.current % 6 === 0) spawnSplash(footX0, false);

      const prevBottom = p.y + PH;
      p.y += p.vy;
      p.onGround = false;
      if (p.y >= GROUND_Y - PH) {
        p.y = GROUND_Y - PH;
        p.vy = 0;
        p.onGround = true;
      }
      const footX = p.x + PW / 2;
      for (const pl of PLATFORMS) {
        if (
          footX >= pl.x &&
          footX <= pl.x + pl.w &&
          prevBottom <= pl.y + 2 &&
          p.y + PH >= pl.y &&
          p.vy >= 0
        ) {
          p.y = pl.y - PH;
          p.vy = 0;
          p.onGround = true;
        }
      }
      // 작은 산·바위는 위에 올라설 수 있다(갇힘 방지 — 넘거나 올라타서 지나감)
      for (const o of obstaclesRef.current) {
        if (o.type === "puddle") continue;
        const ow = OB_W[o.type];
        const otop = GROUND_Y - OB_H[o.type];
        if (
          footX >= o.x &&
          footX <= o.x + ow &&
          prevBottom <= otop + 2 &&
          p.y + PH >= otop &&
          p.vy >= 0
        ) {
          p.y = otop - PH;
          p.vy = 0;
          p.onGround = true;
        }
      }
      if (p.onGround && Math.abs(p.vx) > 0.4) p.anim += Math.abs(p.vx) * 0.3;

      // 장애물을 뛰어넘으면 작은 가속(짜릿함!)
      const fxNow = p.x + PW / 2;
      for (const o of obstaclesRef.current) {
        if (o.cleared) continue;
        if (!p.onGround && fxNow > o.x && fxNow < o.x + OB_W[o.type]) {
          o.cleared = true;
          speedMul.current *= 1.01;
          for (let i = 0; i < 5; i++)
            sparkles.current.push({
              x: fxNow,
              y: p.y + PH,
              vx: (Math.random() - 0.5) * 2,
              vy: -Math.random() * 2,
              life: 20,
            });
        }
      }

      if (slowTimer.current > 0) slowTimer.current -= 1;

      // 풍덩
      if (prevX.current < SEA_START && p.x >= SEA_START) spawnSplash(SEA_START, true);
      if (prevX.current < SEA_END && p.x >= SEA_END) spawnSplash(SEA_END, false);
      if (splashText.current > 0) splashText.current -= 1;
      splash.current = splash.current.filter((s) => s.life > 0);
      for (const s of splash.current) {
        s.x += s.vx;
        s.y += s.vy;
        s.vy += 0.4;
        s.life -= 1;
      }

      // 반딧불 수집(작은 가속)
      for (const f of fireflies.current) {
        if (f.taken) continue;
        if (Math.abs(footX - f.x) < 24 && Math.abs(p.y + PH / 2 - f.y) < 34) {
          f.taken = true;
          speedMul.current *= 1.02;
          for (let i = 0; i < 8; i++)
            sparkles.current.push({
              x: f.x,
              y: f.y,
              vx: (Math.random() - 0.5) * 3,
              vy: (Math.random() - 0.5) * 3,
              life: 24,
            });
        }
      }
      sparkles.current = sparkles.current.filter((s) => s.life > 0);
      for (const s of sparkles.current) {
        s.x += s.vx;
        s.y += s.vy;
        s.life -= 1;
      }

      // 자라 — 오답마다 점점 빨라진다
      turtleX.current += TURTLE * turtleMul.current;

      // 관문
      for (const g of gates.current) {
        if (!g.asked && p.x >= g.x) {
          g.asked = true;
          const item = quizOrder.current[gateCount.current % quizOrder.current.length];
          gateCount.current += 1;
          setQuiz(item);
          phaseRef.current = "quiz";
          setPhase("quiz");
          return;
        }
      }

      if (p.x >= GOAL) {
        phaseRef.current = "win";
        setPhase("win");
        return;
      }
      if (turtleX.current >= GOAL) {
        phaseRef.current = "lose";
        setPhase("lose");
        return;
      }

      const target = p.x - VW * 0.35;
      camX.current += (target - camX.current) * 0.12;
      if (camX.current < 0) camX.current = 0;

      if (rMarkRef.current) rMarkRef.current.style.left = `${Math.min(100, (p.x / GOAL) * 100)}%`;
      if (tMarkRef.current) tMarkRef.current.style.left = `${Math.min(100, (turtleX.current / GOAL) * 100)}%`;
      if (speedRef.current) speedRef.current.textContent = `x${speedMul.current.toFixed(2)}`;
    };

    const draw = () => {
      const cam = camX.current;
      const t = tRef.current;
      const pZoneSea = player.current.x >= SEA_START && player.current.x < SEA_END;

      // 하늘(육지: 노을 톤)
      const sky = ctx.createLinearGradient(0, 0, 0, VH);
      sky.addColorStop(0, "#f7c9a6");
      sky.addColorStop(0.4, "#fbe2cf");
      sky.addColorStop(1, "#e7efe4");
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, VW, VH);

      drawMountain(ctx, cam * 0.2, "#b9cbbf", 230, 120, 0.5);
      drawMountain(ctx, cam * 0.35, "#9fb6a6", 270, 90, 0.7);

      // 반딧불(은은한 분위기) — 육지에서
      if (!pZoneSea)
        for (let i = 0; i < 16; i++) {
          const fx = (i * 137 + ((t * 0.3) % 900)) % VW;
          const fy = 120 + ((i * 53) % 180) + Math.sin(t / 30 + i) * 8;
          ctx.fillStyle = `rgba(255,236,150,${0.3 + 0.3 * Math.sin(t / 20 + i)})`;
          ctx.beginPath();
          ctx.arc(fx, fy, 2, 0, Math.PI * 2);
          ctx.fill();
        }

      ctx.save();
      ctx.translate(-cam, 0);

      // 바다 띠(용궁)
      const sea = ctx.createLinearGradient(0, 0, 0, VH);
      sea.addColorStop(0, "#2f93a6");
      sea.addColorStop(0.5, "#1c6f86");
      sea.addColorStop(1, "#0d3b4e");
      ctx.fillStyle = sea;
      ctx.fillRect(SEA_START, 0, SEA_END - SEA_START, VH);

      // 빛줄기 + 용궁 + 산호 + 거품
      drawLightRays(ctx, SEA_START, SEA_END, cam, t);
      drawPalace(ctx, (SEA_START + SEA_END) / 2);
      drawPalace(ctx, SEA_START + 650);
      drawPalace(ctx, SEA_END - 650);
      for (let x = SEA_START + 90; x < SEA_END; x += 170) {
        if (x - cam < -60 || x - cam > VW + 60) continue;
        drawCoral(ctx, x, (x / 170) % 3);
      }
      for (let x = SEA_START + 40; x < SEA_END; x += 80) {
        if (x - cam < -20 || x - cam > VW + 20) continue;
        const by = GROUND_Y - 20 - ((t * 1.3 + x * 9) % 260);
        ctx.fillStyle = "rgba(220,245,255,0.45)";
        ctx.beginPath();
        ctx.arc(x + Math.sin((t + x) / 20) * 6, by, 2.5 + ((x / 80) % 2), 0, Math.PI * 2);
        ctx.fill();
      }

      // 지면
      drawGround(ctx, 0, SEA_START, "#7f9a52", "#5f4a30");
      drawGround(ctx, SEA_START, SEA_END, "#1c6f86", "#0d3b4e");
      drawGround(ctx, SEA_END, GOAL + VW, "#7f9a52", "#5f4a30");

      // 숲 장식(대나무·나무·꽃)
      for (let x = 120; x < SEA_START; x += 180) {
        if (x - cam < -70 || x - cam > VW + 70) continue;
        if ((x / 180) % 2 < 1) drawBamboo(ctx, x, t);
        else drawTree(ctx, x);
      }
      for (let x = 160; x < SEA_START; x += 150) drawFlower(ctx, x, GROUND_Y - 5, x % 2 ? "#e4572e" : "#f2b705");
      for (let x = SEA_END + 80; x < GOAL; x += 180) {
        if (x - cam < -70 || x - cam > VW + 70) continue;
        if ((x / 180) % 2 < 1) drawBamboo(ctx, x, t);
        else drawTree(ctx, x);
      }
      for (let x = SEA_END + 120; x < GOAL; x += 150) drawFlower(ctx, x, GROUND_Y - 5, x % 2 ? "#e4572e" : "#f2b705");

      // 발판 + 반딧불
      for (const pl of PLATFORMS) {
        if (pl.x - cam < -140 || pl.x - cam > VW + 20) continue;
        ctx.fillStyle = "rgba(60,50,30,0.55)";
        ctx.fillRect(pl.x, pl.y, pl.w, 10);
        ctx.fillStyle = "#8a9a5b";
        ctx.fillRect(pl.x, pl.y, pl.w, 4);
      }
      for (const f of fireflies.current) {
        if (f.taken) continue;
        const g = 0.5 + 0.4 * Math.sin(t / 8 + f.x);
        ctx.fillStyle = `rgba(255,236,150,${g})`;
        ctx.beginPath();
        ctx.arc(f.x, f.y, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#fff6cf";
        ctx.beginPath();
        ctx.arc(f.x, f.y, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }

      // 장애물(물웅덩이·작은 산·바위)
      for (const o of obstaclesRef.current) {
        if (o.x - cam < -90 || o.x - cam > VW + 90) continue;
        drawObstacle(ctx, o);
      }

      drawWaterEdge(ctx, SEA_START, t);
      drawWaterEdge(ctx, SEA_END, t);

      // 스플래시 / 반짝이
      ctx.fillStyle = "#eafaff";
      for (const s of splash.current) {
        ctx.globalAlpha = Math.max(0, s.life / 42);
        ctx.beginPath();
        ctx.arc(s.x, s.y, 3, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      for (const s of sparkles.current) {
        ctx.fillStyle = `rgba(255,236,150,${s.life / 24})`;
        ctx.beginPath();
        ctx.arc(s.x, s.y, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }

      drawGoal(ctx, GOAL);
      drawTurtleMan(ctx, turtleX.current, t, 0);
      drawRabbitGirl(ctx, player.current);

      ctx.restore();

      if (splashText.current > 0) {
        ctx.fillStyle = "#145";
        ctx.font = "bold 34px system-ui, 'Malgun Gothic'";
        ctx.textAlign = "center";
        ctx.fillText("풍덩! 🌊", VW / 2, 130);
        ctx.textAlign = "left";
      }

      ctx.fillStyle = "rgba(43,43,43,0.7)";
      ctx.fillRect(12, 56, 150, 24);
      ctx.fillStyle = "#fff";
      ctx.font = "13px system-ui, 'Malgun Gothic'";
      ctx.fillText(zoneName(player.current.x), 22, 72);

      const tScreen = turtleX.current - cam;
      if (tScreen < -10) {
        ctx.fillStyle = "rgba(43,43,43,0.72)";
        ctx.fillRect(8, 86, 72, 22);
        ctx.fillStyle = "#fff";
        ctx.fillText("◀ 자라", 16, 101);
      } else if (tScreen > VW + 10) {
        ctx.fillStyle = "rgba(43,43,43,0.72)";
        ctx.fillRect(VW - 80, 86, 72, 22);
        ctx.fillStyle = "#fff";
        ctx.fillText("자라 ▶", VW - 72, 101);
      }
    };

    const loop = () => {
      tRef.current += 1;
      update();
      draw();
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  // ===== 배경 헬퍼 =====
  function drawMountain(
    c: CanvasRenderingContext2D,
    off: number,
    color: string,
    baseY: number,
    h: number,
    alpha: number,
  ) {
    c.save();
    c.globalAlpha = alpha;
    c.fillStyle = color;
    c.beginPath();
    c.moveTo(0, VH);
    const span = 300;
    for (let i = -1; i < VW / span + 2; i++) {
      const x = i * span - (off % span);
      c.quadraticCurveTo(x + span / 2, baseY - h, x + span, baseY);
    }
    c.lineTo(VW, VH);
    c.closePath();
    c.fill();
    c.restore();
  }

  function drawGround(c: CanvasRenderingContext2D, x0: number, x1: number, top: string, body: string) {
    const g = c.createLinearGradient(0, GROUND_Y, 0, VH);
    g.addColorStop(0, body);
    g.addColorStop(1, "#000");
    c.fillStyle = top;
    c.fillRect(x0, GROUND_Y, x1 - x0, 10);
    c.fillStyle = body;
    c.fillRect(x0, GROUND_Y + 10, x1 - x0, VH - GROUND_Y);
  }

  function drawBamboo(c: CanvasRenderingContext2D, x: number, t: number) {
    const sway = Math.sin(t / 40 + x) * 6;
    const grd = c.createLinearGradient(x, 60, x, GROUND_Y);
    grd.addColorStop(0, "#9ec47a");
    grd.addColorStop(1, "#5f8a4a");
    c.strokeStyle = grd;
    c.lineWidth = 9;
    c.lineCap = "round";
    c.beginPath();
    c.moveTo(x, GROUND_Y);
    c.quadraticCurveTo(x - 4, 200, x - 10 + sway, 60);
    c.stroke();
    c.strokeStyle = "rgba(60,90,55,0.4)";
    c.lineWidth = 2;
    for (let y = GROUND_Y; y > 70; y -= 52) {
      c.beginPath();
      c.moveTo(x - 6, y);
      c.lineTo(x + 2, y - 3);
      c.stroke();
    }
  }

  function drawTree(c: CanvasRenderingContext2D, x: number) {
    c.fillStyle = "#7a5a34";
    c.fillRect(x - 5, GROUND_Y - 58, 10, 58);
    for (const [dx, dy, r, col] of [
      [0, -76, 28, "#4f7a3f"],
      [-20, -62, 20, "#5f8a4a"],
      [20, -62, 20, "#5f8a4a"],
    ] as const) {
      const g = c.createRadialGradient(x + dx - 6, GROUND_Y + dy - 6, 4, x + dx, GROUND_Y + dy, r);
      g.addColorStop(0, "#7bbf6a");
      g.addColorStop(1, col);
      c.fillStyle = g;
      c.beginPath();
      c.arc(x + dx, GROUND_Y + dy, r, 0, Math.PI * 2);
      c.fill();
    }
  }

  function drawFlower(c: CanvasRenderingContext2D, x: number, y: number, color: string) {
    c.fillStyle = color;
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      c.beginPath();
      c.ellipse(x + Math.cos(a) * 5, y + Math.sin(a) * 5, 3.2, 3.2, 0, 0, Math.PI * 2);
      c.fill();
    }
    c.fillStyle = "#fff6cf";
    c.beginPath();
    c.arc(x, y, 2.4, 0, Math.PI * 2);
    c.fill();
  }

  function drawLightRays(
    c: CanvasRenderingContext2D,
    x0: number,
    x1: number,
    cam: number,
    t: number,
  ) {
    c.save();
    c.globalAlpha = 0.12;
    c.fillStyle = "#cfffff";
    for (let x = x0 + 60; x < x1; x += 180) {
      if (x - cam < -120 || x - cam > VW + 120) continue;
      const sway = Math.sin(t / 60 + x) * 20;
      c.beginPath();
      c.moveTo(x, 0);
      c.lineTo(x + 50, 0);
      c.lineTo(x + 110 + sway, VH);
      c.lineTo(x + 20 + sway, VH);
      c.closePath();
      c.fill();
    }
    c.restore();
  }

  function drawCoral(c: CanvasRenderingContext2D, x: number, kind: number) {
    const col = ["#e0749a", "#b06fd0", "#e08a4f"][kind];
    c.strokeStyle = col;
    c.lineWidth = 5;
    c.lineCap = "round";
    const base = GROUND_Y;
    c.beginPath();
    c.moveTo(x, base);
    c.lineTo(x, base - 26);
    c.moveTo(x, base - 14);
    c.lineTo(x - 12, base - 30);
    c.moveTo(x, base - 18);
    c.lineTo(x + 12, base - 32);
    c.stroke();
    c.fillStyle = col;
    for (const [dx, dy] of [[0, -28], [-13, -32], [13, -34]] as const) {
      c.beginPath();
      c.arc(x + dx, base + dy, 3, 0, Math.PI * 2);
      c.fill();
    }
  }

  function drawPalace(c: CanvasRenderingContext2D, cx: number) {
    c.save();
    c.globalAlpha = 0.6;
    c.fillStyle = "#2a6472";
    c.fillRect(cx - 64, GROUND_Y - 104, 128, 104);
    c.fillStyle = "#b23b2e";
    c.fillRect(cx - 50, GROUND_Y - 90, 12, 90);
    c.fillRect(cx + 38, GROUND_Y - 90, 12, 90);
    c.fillStyle = "#dca23a";
    c.beginPath();
    c.moveTo(cx - 78, GROUND_Y - 104);
    c.lineTo(cx, GROUND_Y - 140);
    c.lineTo(cx + 78, GROUND_Y - 104);
    c.closePath();
    c.fill();
    c.fillStyle = "#143b44";
    c.fillRect(cx - 13, GROUND_Y - 50, 26, 50);
    c.restore();
  }

  function drawWaterEdge(c: CanvasRenderingContext2D, x: number, t: number) {
    c.strokeStyle = "rgba(255,255,255,0.6)";
    c.lineWidth = 3;
    c.beginPath();
    for (let y = 30; y < GROUND_Y; y += 14) {
      const off = Math.sin(y / 20 + t / 10) * 5;
      if (y === 30) c.moveTo(x + off, y);
      else c.lineTo(x + off, y);
    }
    c.stroke();
  }

  function drawObstacle(c: CanvasRenderingContext2D, o: { x: number; type: ObType }) {
    if (o.type === "puddle") {
      const w = OB_W.puddle;
      c.fillStyle = "rgba(70,150,200,0.55)";
      c.beginPath();
      c.ellipse(o.x + w / 2, GROUND_Y + 7, w / 2, 8, 0, 0, Math.PI * 2);
      c.fill();
      c.strokeStyle = "rgba(255,255,255,0.6)";
      c.lineWidth = 1.5;
      c.beginPath();
      c.ellipse(o.x + w / 2, GROUND_Y + 4, w / 2 - 7, 4, 0, 0, Math.PI * 2);
      c.stroke();
      c.fillStyle = "rgba(255,255,255,0.5)";
      c.beginPath();
      c.arc(o.x + w * 0.35, GROUND_Y + 3, 1.6, 0, Math.PI * 2);
      c.fill();
    } else if (o.type === "mound") {
      const w = OB_W.mound;
      const h = OB_H.mound;
      const g = c.createLinearGradient(0, GROUND_Y - h, 0, GROUND_Y);
      g.addColorStop(0, "#86a657");
      g.addColorStop(1, "#5f4a30");
      c.fillStyle = g;
      c.beginPath();
      c.moveTo(o.x, GROUND_Y);
      c.quadraticCurveTo(o.x + w / 2, GROUND_Y - h * 1.7, o.x + w, GROUND_Y);
      c.closePath();
      c.fill();
      c.fillStyle = "#9cbb66";
      c.beginPath();
      c.ellipse(o.x + w / 2, GROUND_Y - h + 7, w / 2 - 5, 5, 0, 0, Math.PI * 2);
      c.fill();
    } else {
      const w = OB_W.rock;
      const h = OB_H.rock;
      const g = c.createLinearGradient(0, GROUND_Y - h, 0, GROUND_Y);
      g.addColorStop(0, "#aab0b6");
      g.addColorStop(1, "#5b6065");
      c.fillStyle = g;
      c.strokeStyle = "#44484c";
      c.lineWidth = 1.5;
      c.beginPath();
      c.moveTo(o.x, GROUND_Y);
      c.quadraticCurveTo(o.x + w * 0.18, GROUND_Y - h, o.x + w * 0.5, GROUND_Y - h);
      c.quadraticCurveTo(o.x + w * 0.82, GROUND_Y - h, o.x + w, GROUND_Y);
      c.closePath();
      c.fill();
      c.stroke();
    }
  }

  function drawGoal(c: CanvasRenderingContext2D, x: number) {
    c.strokeStyle = "#333";
    c.lineWidth = 4;
    c.beginPath();
    c.moveTo(x, GROUND_Y);
    c.lineTo(x, GROUND_Y - 130);
    c.stroke();
    const s = 13;
    for (let r = 0; r < 4; r++)
      for (let col = 0; col < 4; col++) {
        c.fillStyle = (r + col) % 2 ? "#2b2b2b" : "#fff";
        c.fillRect(x + col * s, GROUND_Y - 130 + r * s, s, s);
      }
    c.fillStyle = "#b23b2e";
    c.font = "bold 17px system-ui, 'Malgun Gothic'";
    c.fillText("결승", x - 4, GROUND_Y - 138);
  }

  // ===== 캐릭터(의인화·회화풍) =====
  // 자라(별주부): 검은 갓 쓴 선비, 짙은 도포, 수염
  function drawTurtleMan(c: CanvasRenderingContext2D, x: number, t: number, spin: number) {
    const bob = Math.sin(t / 7) * 2.5;
    const y = GROUND_Y - 52 + bob;
    c.save();
    c.translate(x, y);
    if (spin > 0) c.rotate(Math.sin(spin) * 0.5);

    c.fillStyle = "rgba(0,0,0,0.18)";
    c.beginPath();
    c.ellipse(0, 52 - bob, 20, 5, 0, 0, Math.PI * 2);
    c.fill();

    // 도포(짙은 남색 그라데이션)
    const robe = c.createLinearGradient(0, 14, 0, 52);
    robe.addColorStop(0, "#2d3b55");
    robe.addColorStop(1, "#131b2c");
    c.fillStyle = robe;
    c.strokeStyle = "#0c1220";
    c.lineWidth = 2;
    c.beginPath();
    c.moveTo(-15, 20);
    c.quadraticCurveTo(-20, 44, -14, 52);
    c.lineTo(14, 52);
    c.quadraticCurveTo(20, 44, 15, 20);
    c.quadraticCurveTo(0, 12, -15, 20);
    c.fill();
    c.stroke();
    // 소매
    c.fillStyle = "#38506f";
    c.beginPath();
    c.ellipse(-16, 30, 7, 12, 0.3, 0, Math.PI * 2);
    c.fill();
    c.beginPath();
    c.ellipse(16, 30, 7, 12, -0.3, 0, Math.PI * 2);
    c.fill();
    // 옷깃
    c.strokeStyle = "#cdbf9a";
    c.lineWidth = 3;
    c.beginPath();
    c.moveTo(-6, 18);
    c.lineTo(0, 30);
    c.lineTo(6, 18);
    c.stroke();
    // 부채
    c.fillStyle = "#efe6cf";
    c.strokeStyle = "#9a7a3a";
    c.lineWidth = 1.5;
    c.beginPath();
    c.moveTo(14, 34);
    c.lineTo(28, 24);
    c.lineTo(28, 40);
    c.closePath();
    c.fill();
    c.stroke();

    // 얼굴
    c.fillStyle = "#efcba0";
    c.strokeStyle = "#c79e72";
    c.lineWidth = 1.5;
    c.beginPath();
    c.arc(0, 2, 11, 0, Math.PI * 2);
    c.fill();
    c.stroke();
    // 수염
    c.fillStyle = "#222";
    c.beginPath();
    c.moveTo(-5, 8);
    c.quadraticCurveTo(0, 20, 5, 8);
    c.fill();
    // 눈·눈썹
    c.strokeStyle = "#333";
    c.lineWidth = 1.6;
    c.beginPath();
    c.moveTo(-6, -1);
    c.lineTo(-2, 1);
    c.moveTo(6, -1);
    c.lineTo(2, 1);
    c.stroke();
    c.fillStyle = "#222";
    c.fillRect(-5, 1, 2, 2);
    c.fillRect(3, 1, 2, 2);
    // 갓(검은 갓): 챙 + 통
    c.fillStyle = "rgba(20,20,26,0.92)";
    c.beginPath();
    c.ellipse(0, -8, 20, 6, 0, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = "#15151c";
    c.beginPath();
    c.ellipse(0, -16, 9, 9, 0, Math.PI, Math.PI * 2);
    c.fill();
    c.fillRect(-9, -16, 18, 8);

    c.fillStyle = "#1a2b4a";
    c.font = "bold 12px system-ui, 'Malgun Gothic'";
    c.textAlign = "center";
    c.fillText("자라", 0, -26);
    c.textAlign = "left";
    c.restore();

    if (spin > 0) {
      c.fillStyle = "#145";
      c.font = "bold 18px system-ui, 'Malgun Gothic'";
      c.fillText("💨", x - 44, y);
    }
  }

  // 토끼: 분홍 한복 소녀 + 흰 토끼 귀
  function drawRabbitGirl(
    c: CanvasRenderingContext2D,
    p: { x: number; y: number; onGround: boolean; anim: number; face: number },
  ) {
    const x = p.x + PW / 2;
    const y = p.y;
    const f = p.face;
    const step = p.onGround ? Math.sin(p.anim) * 3 : 0;
    c.save();

    c.fillStyle = "rgba(0,0,0,0.18)";
    c.beginPath();
    c.ellipse(x, GROUND_Y + 4, 16, 4, 0, 0, Math.PI * 2);
    c.fill();

    // 치마(분홍 그라데이션)
    const chima = c.createLinearGradient(0, y + 22, 0, y + PH);
    chima.addColorStop(0, "#e85b9a");
    chima.addColorStop(1, "#c43f7e");
    c.fillStyle = chima;
    c.strokeStyle = "#9c2f61";
    c.lineWidth = 2;
    c.beginPath();
    c.moveTo(x - 7, y + 24);
    c.lineTo(x + 7, y + 24);
    c.quadraticCurveTo(x + 18, y + PH, x + 14 + step, y + PH);
    c.lineTo(x - 14 + step, y + PH);
    c.quadraticCurveTo(x - 18, y + PH, x - 7, y + 24);
    c.fill();
    c.stroke();
    // 저고리(연분홍)
    c.fillStyle = "#fde3ef";
    c.strokeStyle = "#e3a9c6";
    c.beginPath();
    c.moveTo(x - 9, y + 16);
    c.lineTo(x + 9, y + 16);
    c.lineTo(x + 8, y + 26);
    c.lineTo(x - 8, y + 26);
    c.closePath();
    c.fill();
    c.stroke();
    // 고름(붉은 매듭)
    c.fillStyle = "#c0392b";
    c.fillRect(x - 1, y + 18, 3, 9);
    // 소매
    c.fillStyle = "#fde3ef";
    c.beginPath();
    c.ellipse(x - 10, y + 20, 4, 7, 0.4, 0, Math.PI * 2);
    c.fill();
    c.beginPath();
    c.ellipse(x + 10, y + 20, 4, 7, -0.4, 0, Math.PI * 2);
    c.fill();

    // 얼굴
    c.fillStyle = "#fbe0c8";
    c.strokeStyle = "#e6b58c";
    c.lineWidth = 1.5;
    c.beginPath();
    c.arc(x, y + 8, 9, 0, Math.PI * 2);
    c.fill();
    c.stroke();
    // 머리(금발 느낌)
    c.fillStyle = "#e9c86a";
    c.beginPath();
    c.arc(x, y + 3, 9.5, Math.PI, Math.PI * 2);
    c.fill();
    c.fillRect(x - 9.5, y + 2, 4, 9);
    c.fillRect(x + 5.5, y + 2, 4, 9);
    // 머리띠
    c.strokeStyle = "#2b4a86";
    c.lineWidth = 2;
    c.beginPath();
    c.arc(x, y + 6, 9, Math.PI * 1.15, Math.PI * 1.85);
    c.stroke();
    // 토끼 귀
    c.fillStyle = "#fafafa";
    c.strokeStyle = "#d8cfc0";
    c.lineWidth = 1.4;
    for (const ex of [x - 5, x + 5]) {
      c.beginPath();
      c.ellipse(ex, y - 7, 3.2, 9, 0, 0, Math.PI * 2);
      c.fill();
      c.stroke();
    }
    c.fillStyle = "#f3b7c2";
    c.beginPath();
    c.ellipse(x - 5, y - 7, 1.3, 5, 0, 0, Math.PI * 2);
    c.fill();
    c.beginPath();
    c.ellipse(x + 5, y - 7, 1.3, 5, 0, 0, Math.PI * 2);
    c.fill();
    // 눈·입
    c.fillStyle = "#3a2b2b";
    c.beginPath();
    c.arc(x - 3 * f + 0, y + 8, 1.6, 0, Math.PI * 2);
    c.arc(x + 3 * f, y + 8, 1.6, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = "#e0708a";
    c.beginPath();
    c.arc(x, y + 11, 1.2, 0, Math.PI * 2);
    c.fill();

    c.fillStyle = "#9c2f61";
    c.font = "bold 12px system-ui, 'Malgun Gothic'";
    c.textAlign = "center";
    c.fillText("토끼", x, y - 18);
    c.textAlign = "left";
    c.restore();
  }

  return (
    <main className="game-wrap">
      <header className="game-header">
        <a href="/" className="chat-back">
          ← 홈
        </a>
        <span className="chat-title">🏁 토끼 vs 자라 경주</span>
        <button className="fs-btn" onClick={toggleFullscreen} title="전체화면">
          {fs ? "⛶ 창모드" : "⛶ 전체화면"}
        </button>
        <span className="game-hud">
          속도 <span className="game-count" ref={speedRef}>x1.00</span>
        </span>
      </header>

      <div className="game-stage" ref={stageRef}>
        <div className="race-bar">
          <div className="race-track">
            <div className="race-marker rabbit" ref={rMarkRef}>
              🐰
            </div>
            <div className="race-marker turtle" ref={tMarkRef}>
              🐢
            </div>
            <span className="race-flag">🏁</span>
          </div>
        </div>

        <canvas ref={canvasRef} width={VW} height={VH} className="game-canvas" />

        {phase === "intro" && (
          <div className="game-overlay">
            <div className="game-panel">
              <h2>🏁 토끼 vs 자라 경주</h2>
              <p>
                <b>숲 → 용궁(바다) → 숲</b>의 긴 길을 걸어 자라와 결승선까지 달려요!
                중간에 나오는 <b>『토끼전』 질문</b>에…
              </p>
              <p className="game-controls">
                ✅ 정답 → <b>내 속도 UP</b> 🐰💨
                <br />❌ 오답 → <b>자라 속도 UP</b> — 아슬아슬하게 쫓겨요!
              </p>
              <p className="game-controls">
                ← → 걷기 · <b>Space(또는 ↑) 점프</b>로 물웅덩이·작은 산·바위를 뛰어넘어요!
                <br />장애물을 넘거나 반딧불을 주우면 살짝 빨라져요 ✨
              </p>
              <button className="btn" onClick={startGame}>
                출발! ▶
              </button>
            </div>
          </div>
        )}

        {phase === "quiz" && quiz && (
          <div className="game-overlay">
            <div className="game-panel quiz-panel">
              <span className="dialog-tag">❓ 중요한 질문</span>
              <h3 className="quiz-q">{quiz.q}</h3>
              <div className="quiz-opts">
                {quiz.options.map((op, i) => (
                  <button key={i} className="quiz-opt" onClick={() => answerQuiz(i)}>
                    {op}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {phase === "feedback" && feedback && (
          <div className="game-overlay">
            <div className={`game-panel feedback ${feedback.correct ? "ok" : "no"}`}>
              <h2>
                {feedback.correct ? "✅ 정답! 내 속도 UP 🐰💨" : "❌ 아쉬워요… 자라가 빨라져요! 🐢💨"}
              </h2>
              {!feedback.correct && (
                <p className="game-controls">
                  정답: <b>{feedback.answerText}</b> · 자라 속도 UP — 아슬아슬!
                </p>
              )}
              <p>{feedback.explain}</p>
              <button className="btn" onClick={resume}>
                계속 달리기 ▶ <span className="hint">(Enter)</span>
              </button>
            </div>
          </div>
        )}

        {phase === "win" && (
          <div className="game-overlay">
            <div className="game-panel">
              <h2>🎉 토끼 승리!</h2>
              <p>자라보다 먼저 결승선에 도착했어요. 잘했어요!</p>
              <div className="game-btnrow">
                <button className="btn" onClick={startGame}>
                  다시 경주
                </button>
                <a className="btn ghost" href="/chat">
                  말하기 연습으로 →
                </a>
              </div>
            </div>
          </div>
        )}

        {phase === "lose" && (
          <div className="game-overlay">
            <div className="game-panel">
              <h2>🐢 자라가 먼저 도착했어요</h2>
              <p>질문을 맞혀서 속도를 올리면 자라를 앞설 수 있어요. 다시 도전!</p>
              <div className="game-btnrow">
                <button className="btn" onClick={startGame}>
                  다시 경주
                </button>
                <a className="btn ghost" href="/">
                  줄거리 다시 보기 →
                </a>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="game-touch">
        <button
          className="tbtn"
          onTouchStart={() => (keys.current["ArrowLeft"] = true)}
          onTouchEnd={() => (keys.current["ArrowLeft"] = false)}
          aria-label="왼쪽"
        >
          ◀
        </button>
        <button
          className="tbtn"
          onTouchStart={() => (keys.current["ArrowRight"] = true)}
          onTouchEnd={() => (keys.current["ArrowRight"] = false)}
          aria-label="오른쪽"
        >
          ▶
        </button>
        <button
          className="tbtn jump"
          onTouchStart={() => (keys.current["ArrowUp"] = true)}
          onTouchEnd={() => (keys.current["ArrowUp"] = false)}
          aria-label="점프"
        >
          ▲ 점프
        </button>
      </div>
    </main>
  );
}
