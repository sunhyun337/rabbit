"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { QUIZ, type QuizItem } from "@/lib/story/quiz";
import { type ItemId } from "@/lib/story/items";
import { sendLog, newLogId } from "@/lib/clientLog";
import { GameMusic } from "@/lib/gameMusic";

/**
 * 『토끼전』 경주 — 토끼(플레이어) vs 자라(AI). 의인화·회화풍.
 * 긴 스테이지를 ←→ 로 걷고 ↑/Space 로 점프하며 결승선까지 간다.
 * 배경(구간): 용궁(바닷속) → 산속(숲) → 바다와 산(해안). 용궁→산속 전환 시 '풍덩'(물 밖으로).
 * 중간 질문(퀴즈):
 *  - 정답 → 자라를 뒤로 날려버리고 자라 속도 저하 🐢💨
 *  - 오답 → 내 속도가 잠시 느려짐 (길을 막는 용왕 없음)
 * 사건 이해 중심(원리1), 주제·교훈은 묻지 않음(원리4).
 */

const VW = 900;
const VH = 460;
const GROUND_Y = 384;
const GOAL = 13500;
const SEC = GOAL / 3; // 구간 폭(4500): 용궁 / 산속 / 바다와 산

// 물리상 '바닷속'(물속: 점프 가벼움·바위/산호/성게) 구간 = 첫 구간(용궁)
const SEA_START = 0;
const SEA_END = SEC;

const RUN = 3.5;
const ACCEL = 0.6;
const TURTLE = 2.0;

const PW = 28;
const PH = 48;

// 공중에 띄운 얇은 단(허들) — 반드시 점프해서 넘어야 한다(아래로는 못 지나감). 코인은 그 위에.
const PLAT_THICK = 12;
const PLATFORMS: { x: number; y: number; w: number }[] = [];
for (let i = 0, x = 820; x < GOAL - 500; x += 900, i++) {
  PLATFORMS.push({ x, y: GROUND_Y - (i % 2 ? 52 : 42), w: 92 });
}

// 질문 관문 — 한 판에 많이 물어본다(약 20개)
const GATES: number[] = [];
for (let x = 640; x < GOAL - 500; x += 640) GATES.push(x);

// 지형 — 지하 구덩이(pit)에 떨어졌다 올라오고, 구름다리(bridge)를 타고 올라갔다 내려온다.
type TerrainType = "pit" | "bridge";
interface Terrain {
  type: TerrainType;
  x: number;
  w: number;
  d: number; // 깊이(pit=아래로) / 높이(bridge=위로)
}
const TERRAIN: Terrain[] = [];
{
  let tt = 0;
  for (let i = 1; i < GATES.length - 1; i += 2) {
    const mid = (GATES[i] + GATES[i + 1]) / 2;
    // 구덩이를 더 자주(둘에 하나꼴로 구름다리)
    const type: TerrainType = tt % 3 === 2 ? "bridge" : "pit";
    const w = type === "pit" ? 120 : 210;
    const x = Math.round(mid - w / 2);
    if (Math.abs(x - SEA_END) < 320 || Math.abs(x + w - SEA_END) < 320) continue;
    if (PLATFORMS.some((p) => p.x > x - 130 && p.x < x + w + 130)) continue;
    TERRAIN.push({ type, x, w, d: type === "pit" ? 104 : 92 });
    tt++;
  }
}
/** 해당 x의 지면 높이. 구덩이는 수직 벽(평평한 바닥), 구름다리는 완만한 경사. */
function groundAt(x: number): number {
  for (const f of TERRAIN) {
    if (x > f.x && x < f.x + f.w) {
      if (f.type === "pit") return GROUND_Y + f.d; // 수직 벽 구덩이
      const t = (x - f.x) / f.w;
      const r = 0.3;
      const k = t < r ? t / r : t > 1 - r ? (1 - t) / r : 1;
      return GROUND_Y - f.d * k; // 구름다리(경사)
    }
  }
  return GROUND_Y;
}

// 구덩이(pit) 그림 스프라이트 — 숲 구덩이 그림에서 구멍+바위 테두리만 잘라
// 가장자리를 페이드해 게임 지면에 자연스럽게 녹아들게 가공한 결과를 캐시한다.
let PIT_IMG: HTMLCanvasElement | null = null;
function bakePitSprite(im: HTMLImageElement): HTMLCanvasElement {
  const CROP = { sx: 208, sy: 258, sw: 464, sh: 301 };
  const o = document.createElement("canvas");
  o.width = CROP.sw;
  o.height = CROP.sh;
  const oc = o.getContext("2d")!;
  oc.drawImage(im, CROP.sx, CROP.sy, CROP.sw, CROP.sh, 0, 0, CROP.sw, CROP.sh);
  oc.globalCompositeOperation = "destination-out";
  let g = oc.createLinearGradient(0, 0, 0, 70); // 윗면: 지면에 녹아들게 강한 페이드
  g.addColorStop(0, "rgba(0,0,0,1)");
  g.addColorStop(1, "rgba(0,0,0,0)");
  oc.fillStyle = g;
  oc.fillRect(0, 0, CROP.sw, 70);
  const F = 30; // 좌우/하단: 약한 페이드
  g = oc.createLinearGradient(0, 0, F, 0);
  g.addColorStop(0, "rgba(0,0,0,0.9)");
  g.addColorStop(1, "rgba(0,0,0,0)");
  oc.fillStyle = g;
  oc.fillRect(0, 0, F, CROP.sh);
  g = oc.createLinearGradient(CROP.sw, 0, CROP.sw - F, 0);
  g.addColorStop(0, "rgba(0,0,0,0.9)");
  g.addColorStop(1, "rgba(0,0,0,0)");
  oc.fillStyle = g;
  oc.fillRect(CROP.sw - F, 0, F, CROP.sh);
  g = oc.createLinearGradient(0, CROP.sh, 0, CROP.sh - F);
  g.addColorStop(0, "rgba(0,0,0,0.6)");
  g.addColorStop(1, "rgba(0,0,0,0)");
  oc.fillStyle = g;
  oc.fillRect(0, CROP.sh - F, CROP.sw, F);
  oc.globalCompositeOperation = "source-over";
  return o;
}

// 통나무(log) 장애물 그림 스프라이트 — 쓰러진 고목 그림에서 트렁크+뿌리만 잘라
// 상·하·좌·우 가장자리를 페이드해 게임 지면에 자연스럽게 녹아들게 가공.
let LOG_IMG: HTMLCanvasElement | null = null;
function bakeLogSprite(im: HTMLImageElement): HTMLCanvasElement {
  const CROP = { sx: 20, sy: 120, sw: 1160, sh: 420 };
  const o = document.createElement("canvas");
  o.width = CROP.sw;
  o.height = CROP.sh;
  const oc = o.getContext("2d")!;
  oc.drawImage(im, CROP.sx, CROP.sy, CROP.sw, CROP.sh, 0, 0, CROP.sw, CROP.sh);
  const W = CROP.sw,
    H = CROP.sh;
  oc.globalCompositeOperation = "destination-out";
  let g = oc.createLinearGradient(0, 0, 0, 150); // 상단 하늘 페이드
  g.addColorStop(0, "rgba(0,0,0,1)");
  g.addColorStop(1, "rgba(0,0,0,0)");
  oc.fillStyle = g;
  oc.fillRect(0, 0, W, 150);
  g = oc.createLinearGradient(0, H, 0, H - 70); // 하단 지면 페이드
  g.addColorStop(0, "rgba(0,0,0,0.9)");
  g.addColorStop(1, "rgba(0,0,0,0)");
  oc.fillStyle = g;
  oc.fillRect(0, H - 70, W, 70);
  g = oc.createLinearGradient(0, 0, 90, 0); // 좌
  g.addColorStop(0, "rgba(0,0,0,0.95)");
  g.addColorStop(1, "rgba(0,0,0,0)");
  oc.fillStyle = g;
  oc.fillRect(0, 0, 90, H);
  g = oc.createLinearGradient(W, 0, W - 90, 0); // 우
  g.addColorStop(0, "rgba(0,0,0,0.95)");
  g.addColorStop(1, "rgba(0,0,0,0)");
  oc.fillStyle = g;
  oc.fillRect(W - 90, 0, 90, H);
  oc.globalCompositeOperation = "source-over";
  return o;
}

// 바위(rock) 장애물 그림 스프라이트 — 바위 그림에서 바위 덩어리만 잘라
// (밝은 하늘만 제거 + 타원 비네트로 가장자리 배경 페이드).
let ROCK_IMG: HTMLCanvasElement | null = null;
function bakeRockSprite(im: HTMLImageElement): HTMLCanvasElement {
  const CROP = { sx: 185, sy: 32, sw: 545, sh: 446 };
  const o = document.createElement("canvas");
  o.width = CROP.sw;
  o.height = CROP.sh;
  const oc = o.getContext("2d")!;
  oc.drawImage(im, CROP.sx, CROP.sy, CROP.sw, CROP.sh, 0, 0, CROP.sw, CROP.sh);
  const W = CROP.sw,
    H = CROP.sh;
  const id = oc.getImageData(0, 0, W, H);
  const d = id.data;
  const N = W * H;
  const lum = (p: number) => 0.3 * d[p * 4] + 0.59 * d[p * 4 + 1] + 0.11 * d[p * 4 + 2];
  const sat = (p: number) => {
    const r = d[p * 4],
      g = d[p * 4 + 1],
      b = d[p * 4 + 2];
    return Math.max(r, g, b) - Math.min(r, g, b);
  };
  // 1) 밝은 하늘만 가장자리 플러드필로 제거
  const isSky = (p: number) => lum(p) > 140 && sat(p) < 45;
  const bg = new Uint8Array(N);
  const st: number[] = [];
  for (let x = 0; x < W; x++) st.push(x, (H - 1) * W + x);
  for (let y = 0; y < H; y++) st.push(y * W, y * W + W - 1);
  while (st.length) {
    const p = st.pop()!;
    if (bg[p] || !isSky(p)) continue;
    bg[p] = 1;
    const px = p % W,
      py = (p - px) / W;
    if (px > 0) st.push(p - 1);
    if (px < W - 1) st.push(p + 1);
    if (py > 0) st.push(p - W);
    if (py < H - 1) st.push(p + W);
  }
  for (let p = 0; p < N; p++) if (bg[p]) d[p * 4 + 3] = 0;
  oc.putImageData(id, 0, 0);
  // 2) 타원 비네트로 가운데 바위만 남기고 가장자리 배경 페이드
  oc.globalCompositeOperation = "destination-in";
  const cx = W / 2,
    cy = H * 0.52;
  const rg = oc.createRadialGradient(cx, cy, Math.min(W, H) * 0.16, cx, cy, W * 0.5);
  rg.addColorStop(0, "rgba(0,0,0,1)");
  rg.addColorStop(0.62, "rgba(0,0,0,1)");
  rg.addColorStop(1, "rgba(0,0,0,0)");
  oc.save();
  oc.translate(cx, cy);
  oc.scale(1, H / W);
  oc.translate(-cx, -cy);
  oc.fillStyle = rg;
  oc.fillRect(0, 0, W, H);
  oc.restore();
  oc.globalCompositeOperation = "source-over";
  // 3) 남은 영역 bbox로 크롭
  const a = oc.getImageData(0, 0, W, H).data;
  let minx = W,
    miny = H,
    maxx = 0,
    maxy = 0;
  for (let p = 0; p < N; p++) {
    if (a[p * 4 + 3] > 12) {
      const px = p % W,
        py = (p - px) / W;
      if (px < minx) minx = px;
      if (px > maxx) maxx = px;
      if (py < miny) miny = py;
      if (py > maxy) maxy = py;
    }
  }
  const cw = Math.max(1, maxx - minx + 1),
    ch = Math.max(1, maxy - miny + 1);
  const out = document.createElement("canvas");
  out.width = cw;
  out.height = ch;
  out.getContext("2d")!.drawImage(o, minx, miny, cw, ch, 0, 0, cw, ch);
  return out;
}

/** 지형(구덩이·구름다리) 그리기 — 지면 곡선을 따라 그린다. */
function drawTerrain(c: CanvasRenderingContext2D, f: Terrain) {
  const N = 26;
  const pts: [number, number][] = [];
  for (let i = 0; i <= N; i++) {
    const x = f.x + (f.w * i) / N;
    pts.push([x, groundAt(x)]);
  }
  if (f.type === "pit") {
    // 구덩이 그림(숲 구덩이)이 준비되면 그걸로 그린다. 충돌 박스(f.w=120)보다
    // 넓게·센터정렬로 그려 그림이 눌리지 않게 하고, 윗부분을 지면에 맞춘다.
    if (PIT_IMG) {
      const cx = f.x + f.w / 2;
      const DW = f.w * 2.0;
      const DH = DW * (PIT_IMG.height / PIT_IMG.width);
      c.drawImage(PIT_IMG, cx - DW / 2, GROUND_Y - 24, DW, DH);
      return;
    }
    // (폴백) 지하 구덩이 — 가장자리(테두리)만 벽돌, 안쪽은 비어 있는 어두운 구멍
    const topY = GROUND_Y;
    const botY = GROUND_Y + f.d;
    const BH = 12; // 벽돌 높이(한 단)
    const RIM = 16; // 가장자리 벽돌 테두리 두께
    const BRICKS = ["#a85a31", "#8f4a28", "#b5693c"]; // 붉은 벽돌 색 변주

    // 1) 구덩이 안쪽(빈 공간) — 아래로 갈수록 캄캄한 갱도
    const hole = c.createLinearGradient(0, topY, 0, botY);
    hole.addColorStop(0, "#1a1008");
    hole.addColorStop(0.5, "#0a0603");
    hole.addColorStop(1, "#000");
    c.fillStyle = hole;
    c.fillRect(f.x, topY, f.w, f.d);
    // 입구 안쪽 턱 그림자(가운데 구멍만)
    const lip = c.createLinearGradient(0, topY, 0, topY + 16);
    lip.addColorStop(0, "rgba(0,0,0,0.6)");
    lip.addColorStop(1, "rgba(0,0,0,0)");
    c.fillStyle = lip;
    c.fillRect(f.x + RIM, topY, f.w - RIM * 2, 16);

    // 벽돌 한 장(윗면 하이라이트 + 아랫면 그림자)
    const brick = (x0: number, y0: number, w: number, h: number, tone: number) => {
      if (w <= 0) return;
      c.fillStyle = BRICKS[((tone % 3) + 3) % 3];
      c.fillRect(x0, y0, w, h);
      c.fillStyle = "rgba(255,221,180,0.18)";
      c.fillRect(x0, y0, w, 2);
      c.fillStyle = "rgba(0,0,0,0.25)";
      c.fillRect(x0, y0 + h - 1, w, 1);
    };

    // 2) 좌·우 가장자리 벽돌 기둥(세로로 쌓기) — 줄눈(모르타르) 바탕 위에
    c.fillStyle = "#2e2016";
    c.fillRect(f.x, topY, RIM, f.d);
    c.fillRect(f.x + f.w - RIM, topY, RIM, f.d);
    let row = 0;
    for (let y = topY; y < botY; y += BH, row++) {
      brick(f.x + 1, y + 1, RIM - 2, BH - 2, row); // 왼쪽 기둥
      brick(f.x + f.w - RIM + 1, y + 1, RIM - 2, BH - 2, row + 1); // 오른쪽 기둥
    }

    // 3) 깊이감 — 전체에 아래로 갈수록 어둠(벽돌도 아래쪽은 어둑)
    const depth = c.createLinearGradient(0, topY, 0, botY);
    depth.addColorStop(0, "rgba(0,0,0,0)");
    depth.addColorStop(0.55, "rgba(0,0,0,0.3)");
    depth.addColorStop(1, "rgba(0,0,0,0.85)");
    c.fillStyle = depth;
    c.fillRect(f.x, topY, f.w, f.d);
    // 벽돌 기둥 안쪽 모서리 그림자(구멍이 움푹 들어가 보이게)
    c.fillStyle = "rgba(0,0,0,0.3)";
    c.fillRect(f.x + RIM, topY, 3, f.d);
    c.fillRect(f.x + f.w - RIM - 3, topY, 3, f.d);

    // 4) 상단 코핑(테두리 윗단 벽돌 한 줄) — 가장자리 벽돌 마감
    c.fillStyle = "#2e2016";
    c.fillRect(f.x - 2, topY - 6, f.w + 4, 7);
    for (let bx = f.x - 2, i = 0; bx < f.x + f.w + 2; bx += 20, i++) {
      const w = Math.min(18, f.x + f.w + 2 - bx - 1);
      brick(bx + 1, topY - 5, w, 5, i);
    }

    // 5) 좌우 가장자리 풀
    c.fillStyle = "#6f8a3f";
    for (const ex of [f.x, f.x + f.w]) {
      for (let k = -1; k <= 1; k++) {
        const gx = ex + k * 5;
        c.beginPath();
        c.moveTo(gx - 2, topY - 5);
        c.quadraticCurveTo(gx, topY - 15, gx + 1, topY - 4);
        c.quadraticCurveTo(gx + 2, topY - 11, gx + 4, topY - 5);
        c.closePath();
        c.fill();
      }
    }
  } else {
    // 구름다리(올라갔다 내려오는 나무 다리)
    const g = c.createLinearGradient(0, GROUND_Y - f.d, 0, GROUND_Y);
    g.addColorStop(0, "#a6794a");
    g.addColorStop(1, "#6b4423");
    c.fillStyle = g;
    c.beginPath();
    c.moveTo(f.x, GROUND_Y);
    for (const [x, y] of pts) c.lineTo(x, y);
    c.lineTo(f.x + f.w, GROUND_Y);
    c.closePath();
    c.fill();
    // 지지 기둥
    c.strokeStyle = "#5e3f1f";
    c.lineWidth = 3;
    for (let i = 2; i < N - 1; i += 3) {
      const [x, y] = pts[i];
      c.beginPath();
      c.moveTo(x, y);
      c.lineTo(x, GROUND_Y);
      c.stroke();
    }
    // 널빤지 윗면
    c.strokeStyle = "#7a5230";
    c.lineWidth = 7;
    c.lineCap = "round";
    c.beginPath();
    pts.forEach(([x, y], i) => (i ? c.lineTo(x, y - 3) : c.moveTo(x, y - 3)));
    c.stroke();
    c.strokeStyle = "#a9814c";
    c.lineWidth = 2;
    c.beginPath();
    pts.forEach(([x, y], i) => (i ? c.lineTo(x, y - 5) : c.moveTo(x, y - 5)));
    c.stroke();
    // 사다리 가로대(양쪽 경사 구간)
    c.strokeStyle = "#6b4423";
    c.lineWidth = 2;
    for (let i = 0; i <= N; i++) {
      const t = i / N;
      if ((t > 0.04 && t < 0.28) || (t > 0.72 && t < 0.96)) {
        const [x, y] = pts[i];
        c.beginPath();
        c.moveTo(x - 7, y + 6);
        c.lineTo(x + 7, y + 6);
        c.stroke();
      }
    }
    c.lineCap = "butt";
  }
}

// 장애물
//  육지: 웅덩이 puddle(빠지면 느려짐) · 작은산 mound · 통나무 log · 가시덤불 thorns(밟으면 아픔) · 그루터기 stump
//  바다: 바위 rock · 산호 coral · 성게 urchin(밟으면 아픔)
//  solid(mound/rock/log/stump/coral)는 막히지만 올라탈 수 있고, hazard(puddle/thorns/urchin)는
//  통과되지만 밟으면 벌칙 → 뛰어넘어야 유리.
type ObType =
  | "puddle"
  | "mound"
  | "rock"
  | "log"
  | "stump"
  | "thorns"
  | "coral"
  | "urchin";
const OB_W: Record<ObType, number> = {
  puddle: 66,
  mound: 46,
  rock: 40,
  log: 74,
  stump: 34,
  thorns: 52,
  coral: 36,
  urchin: 40,
};
const OB_H: Record<ObType, number> = {
  puddle: 0,
  mound: 36,
  rock: 30,
  log: 26,
  stump: 54,
  thorns: 0,
  coral: 48,
  urchin: 0,
};
const HAZARDS = new Set<ObType>(["puddle", "thorns", "urchin"]);

const LAND_TYPES: ObType[] = ["puddle", "mound", "log", "thorns", "stump"];
const SEA_TYPES: ObType[] = ["rock", "coral", "urchin"];
const OB_DEFS: { x: number; type: ObType }[] = [];
let _li = 0;
let _si = 0;
for (let x = 380; x < GOAL - 300; x += 330) {
  if (x < 360) continue;
  if (GATES.some((g) => Math.abs(g - x) < 115)) continue;
  if (PLATFORMS.some((p) => x > p.x - 55 && x < p.x + p.w + 55)) continue;
  // 지형(구덩이·구름다리) 위에는 장애물을 두지 않는다
  if (TERRAIN.some((f) => x > f.x - 60 && x < f.x + f.w + 60)) continue;
  // 구간 경계(숲↔바다) 주변은 비워서 전환이 항상 뚫리게 한다
  if (Math.abs(x - SEA_START) < 230 || Math.abs(x - SEA_END) < 230) continue;
  const inSea = x >= SEA_START && x < SEA_END;
  const type: ObType = inSea
    ? SEA_TYPES[_si++ % SEA_TYPES.length]
    : LAND_TYPES[_li++ % LAND_TYPES.length];
  OB_DEFS.push({ x, type });
}

type Phase = "intro" | "running" | "quiz" | "win" | "lose";

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** 보기를 섞고 정답 인덱스를 다시 계산한다(정답이 늘 1번이 되지 않도록). */
function shuffleOptions(item: QuizItem): QuizItem {
  const correct = item.options[item.answer];
  const options = shuffle(item.options);
  return { ...item, options, answer: options.indexOf(correct) };
}

function zoneName(x: number) {
  if (x < SEC) return "🌊 용궁 (바닷속)";
  if (x < SEC * 2) return "🌲 산속 (숲)";
  return "🏖️ 바다와 산 (해안)";
}

// 구간 [x0,x1)에 배경 그림을 채운다(세로는 화면 높이에 맞추고 가로는 원본 비율로 반복).
function drawSectionBg(
  c: CanvasRenderingContext2D,
  x0: number,
  x1: number,
  img: HTMLImageElement | null,
  fallback: string,
) {
  c.save();
  c.beginPath();
  c.rect(x0, 0, x1 - x0, VH);
  c.clip();
  if (img && img.width > 0) {
    const w = VH * (img.width / img.height);
    for (let x = x0; x < x1; x += w) c.drawImage(img, x, 0, w, VH);
  } else {
    c.fillStyle = fallback;
    c.fillRect(x0, 0, x1 - x0, VH);
  }
  c.restore();
}

/**
 * 캐릭터 그림(흰 배경)을 게임 스프라이트로 가공한다.
 *  1) 가장자리에서 연결된 흰색만 투명 처리(내부 흰색·옷은 보존)
 *  2) 남은 불투명 픽셀 중 '가장 큰 덩어리'(캐릭터)만 남기고 소품(벼루 등) 제거
 *  3) 캐릭터 영역으로 crop
 */
function processSprite(img: HTMLImageElement): HTMLCanvasElement {
  const scale = Math.min(1, 420 / img.width);
  const w = Math.max(1, Math.round(img.width * scale));
  const h = Math.max(1, Math.round(img.height * scale));
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d")!;
  ctx.drawImage(img, 0, 0, w, h);
  const id = ctx.getImageData(0, 0, w, h);
  const d = id.data;
  const N = w * h;
  // 순백뿐 아니라 '크림색 종이' 배경까지 배경으로 본다.
  // (캐릭터는 진한 외곽선으로 둘러싸여 있어, 느슨한 기준이어도 내부 색은 보존됨)
  const isWhite = (p: number) =>
    d[p * 4] > 206 && d[p * 4 + 1] > 200 && d[p * 4 + 2] > 188;

  // 1) 테두리에서 흰색 flood fill → 배경
  const bg = new Uint8Array(N);
  const stack: number[] = [];
  for (let x = 0; x < w; x++) stack.push(x, (h - 1) * w + x);
  for (let y = 0; y < h; y++) stack.push(y * w, y * w + w - 1);
  while (stack.length) {
    const p = stack.pop()!;
    if (bg[p] || !isWhite(p)) continue;
    bg[p] = 1;
    const px = p % w;
    const py = (p - px) / w;
    if (px > 0) stack.push(p - 1);
    if (px < w - 1) stack.push(p + 1);
    if (py > 0) stack.push(p - w);
    if (py < h - 1) stack.push(p + w);
  }

  // 2) 불투명 픽셀 중 가장 큰 연결 덩어리 찾기
  const comp = new Int32Array(N);
  let curId = 0;
  let bestId = 0;
  let bestSize = 0;
  for (let p = 0; p < N; p++) {
    if (bg[p] || comp[p]) continue;
    curId++;
    let size = 0;
    const s = [p];
    comp[p] = curId;
    while (s.length) {
      const q = s.pop()!;
      size++;
      const qx = q % w;
      const qy = (q - qx) / w;
      if (qx > 0 && !bg[q - 1] && !comp[q - 1]) (comp[q - 1] = curId), s.push(q - 1);
      if (qx < w - 1 && !bg[q + 1] && !comp[q + 1]) (comp[q + 1] = curId), s.push(q + 1);
      if (qy > 0 && !bg[q - w] && !comp[q - w]) (comp[q - w] = curId), s.push(q - w);
      if (qy < h - 1 && !bg[q + w] && !comp[q + w]) (comp[q + w] = curId), s.push(q + w);
    }
    if (size > bestSize) {
      bestSize = size;
      bestId = curId;
    }
  }

  // 3) 가장 큰 덩어리만 남기고 나머지 투명 + bbox crop
  let minx = w;
  let miny = h;
  let maxx = 0;
  let maxy = 0;
  for (let p = 0; p < N; p++) {
    if (comp[p] === bestId) {
      const px = p % w;
      const py = (p - px) / w;
      if (px < minx) minx = px;
      if (px > maxx) maxx = px;
      if (py < miny) miny = py;
      if (py > maxy) maxy = py;
    } else {
      d[p * 4 + 3] = 0;
    }
  }
  ctx.putImageData(id, 0, 0);
  const cw = Math.max(1, maxx - minx + 1);
  const ch = Math.max(1, maxy - miny + 1);
  const out = document.createElement("canvas");
  out.width = cw;
  out.height = ch;
  out.getContext("2d")!.drawImage(c, minx, miny, cw, ch, 0, 0, cw, ch);
  return out;
}

export default function GamePage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const [phase, setPhase] = useState<Phase>("intro");
  const [quiz, setQuiz] = useState<QuizItem | null>(null);
  const [quizWrong, setQuizWrong] = useState<number[]>([]); // 이번 문제에서 틀린 보기
  const [fs, setFs] = useState(false);
  const [muted, setMuted] = useState(false);

  const musicRef = useRef<GameMusic | null>(null);
  const wasInPuddle = useRef(false);
  const phaseRef = useRef<Phase>("intro");
  const keys = useRef<Record<string, boolean>>({});
  const player = useRef({ x: 40, y: GROUND_Y - PH, vx: 0, vy: 0, onGround: true, face: 1, anim: 0 });
  const prevX = useRef(40);
  const turtleX = useRef(60);
  const turtleMul = useRef(1);
  const speedMul = useRef(1);
  const slowTimer = useRef(0);
  const obstaclesRef = useRef<
    { x: number; type: ObType; cleared: boolean; hit: boolean }[]
  >([]);
  const fireflies = useRef<{ x: number; y: number; taken: boolean }[]>([]);
  const sparkles = useRef<{ x: number; y: number; vx: number; vy: number; life: number }[]>([]);
  const splash = useRef<{ x: number; y: number; vx: number; vy: number; life: number }[]>([]);
  const splashText = useRef(0);
  const toastText = useRef(""); // 화면 중앙 잠깐 뜨는 안내
  const toastTimer = useRef(0);
  const toastColor = useRef("#c0392b");
  const gates = useRef(GATES.map((x) => ({ x, asked: false })));
  const quizOrder = useRef<QuizItem[]>([]);
  const gateCount = useRef(0);
  const gameSessionRef = useRef<string>("");
  const camX = useRef(0);
  const tRef = useRef(0);
  const rafRef = useRef<number | null>(null);

  const rMarkRef = useRef<HTMLDivElement>(null);
  const tMarkRef = useRef<HTMLDivElement>(null);
  const speedRef = useRef<HTMLSpanElement>(null);

  // ===== 퀴즈에서 얻은 아이템 ↔ 게임 연계 =====
  const [equipped] = useState<ItemId[]>([]);
  const equippedRef = useRef<ItemId[]>([]);
  const jumpMul = useRef(1);
  const accelMul = useRef(1);
  const slowImmune = useRef(false);

  // 줄거리 그림체 캐릭터 스프라이트(흰/크림 배경 제거 가공본)
  const rabbitImg = useRef<HTMLCanvasElement | null>(null);
  const turtleImg = useRef<HTMLCanvasElement | null>(null);
  // 배경 그림(구간): [0]용궁 [1]산속 [2]바다와 산
  const bgImgs = useRef<(HTMLImageElement | null)[]>([null, null, null]);

  useEffect(() => {
    let alive = true;
    const load = (src: string) =>
      new Promise<HTMLImageElement | null>((res) => {
        const im = new Image();
        im.onload = () => res(im);
        im.onerror = () => res(null);
        im.src = src;
      });
    (async () => {
      const [r, t, b1, b2, b3, pit, log, rock] = await Promise.all([
        load("/assets/char/tokki.webp"),
        load("/assets/char/jara.webp"),
        load("/assets/game/bg1-palace.webp"),
        load("/assets/game/bg2-forest.webp"),
        load("/assets/game/bg3-coast.webp"),
        load("/assets/game/pit-source.webp"),
        load("/assets/game/log.webp"),
        load("/assets/game/rock.webp"),
      ]);
      if (!alive) return;
      bgImgs.current = [b1, b2, b3];
      try {
        if (r) rabbitImg.current = processSprite(r);
        if (t) turtleImg.current = processSprite(t);
        if (pit) PIT_IMG = bakePitSprite(pit);
        if (log) LOG_IMG = bakeLogSprite(log);
        if (rock) ROCK_IMG = bakeRockSprite(rock);
      } catch {
        /* 가공 실패 시 기존 벡터 캐릭터/구덩이/통나무/바위로 폴백 */
      }
    })();
    return () => {
      alive = false;
    };
  }, []);
  useEffect(() => {
    equippedRef.current = equipped;
  }, [equipped]);

  const resetGame = useCallback(() => {
    player.current = { x: 40, y: GROUND_Y - PH, vx: 0, vy: 0, onGround: true, face: 1, anim: 0 };
    prevX.current = 40;
    wasInPuddle.current = false;
    turtleX.current = 60;
    turtleMul.current = 1;
    speedMul.current = 1;
    jumpMul.current = 1;
    accelMul.current = 1;
    slowImmune.current = false;
    // 장착한 아이템 효과 적용(중첩 가능)
    {
      const eq = new Set(equippedRef.current);
      if (eq.has("wings")) speedMul.current *= 1.3; // 날개: 속도 UP
      if (eq.has("wind")) {
        speedMul.current *= 1.1;
        accelMul.current *= 1.8; // 바람 부적: 가속 UP
      }
      if (eq.has("carrot")) jumpMul.current *= 1.28; // 황금 당근: 점프 UP
      if (eq.has("shield")) slowImmune.current = true; // 등딱지 방패: 감속 면역
      if (eq.has("star")) turtleMul.current *= 0.8; // 행운의 별: 자라 느려짐
    }
    slowTimer.current = 0;
    obstaclesRef.current = OB_DEFS.map((o) => ({
      ...o,
      cleared: false,
      hit: false,
    }));
    fireflies.current = PLATFORMS.map((p) => ({ x: p.x + p.w / 2, y: p.y - 22, taken: false }));
    sparkles.current = [];
    splash.current = [];
    splashText.current = 0;
    toastTimer.current = 0;
    gates.current = GATES.map((x) => ({ x, asked: false }));
    quizOrder.current = shuffle(QUIZ).map(shuffleOptions);
    gateCount.current = 0;
    camX.current = 0;
  }, []);

  const startGame = useCallback(() => {
    resetGame();
    gameSessionRef.current = newLogId();
    setQuiz(null);
    setQuizWrong([]);
    phaseRef.current = "running";
    setPhase("running");
    musicRef.current?.start(); // 사용자 제스처(출발) 이후 → 자동재생 정책 통과
  }, [resetGame]);

  const answerQuiz = useCallback(
    (idx: number) => {
      const item = quiz;
      if (!item) return;
      const correct = idx === item.answer;
      sendLog([
        {
          feature: "game",
          mode: "quiz",
          content: item.q,
          session_id: gameSessionRef.current,
          meta: {
            event: "quiz",
            question: item.q,
            picked: item.options[idx],
            correct_answer: item.options[item.answer],
            is_correct: correct,
          },
        },
      ]);
      const p = player.current;
      const resumeRun = () => {
        setQuiz(null);
        setQuizWrong([]);
        phaseRef.current = "running";
        setPhase("running");
      };
      if (correct) {
        // 정답 → 토끼 살짝 빨라짐, "맞았어요!" 띄우고 바로 진행
        speedMul.current *= 1.06;
        toastText.current = "맞았어요!";
        toastColor.current = "#2e7d32";
        toastTimer.current = 80;
        for (let i = 0; i < 12; i++)
          sparkles.current.push({
            x: p.x + PW / 2,
            y: p.y + PH / 2,
            vx: (Math.random() - 0.5) * 3.5,
            vy: -Math.random() * 3 - 1,
            life: 28,
          });
        resumeRun();
        return;
      }
      // 오답
      const nextWrong = quizWrong.includes(idx) ? quizWrong : [...quizWrong, idx];
      if (nextWrong.length >= 2) {
        // 2번째도 오답 → "또 틀렸네요." 잠깐 띄우고 바로 진행
        turtleMul.current *= 1.14;
        slowTimer.current = 110;
        toastText.current = "또 틀렸네요.";
        toastColor.current = "#c0392b";
        toastTimer.current = 80;
        for (let i = 0; i < 8; i++)
          splash.current.push({
            x: p.x + PW / 2,
            y: p.y + PH,
            vx: (Math.random() - 0.5) * 3,
            vy: -Math.random() * 3 - 1,
            life: 30,
          });
        resumeRun();
      } else {
        // 1번째 오답 → "다시 하세요" (같은 문제 다시 풀기)
        setQuizWrong(nextWrong);
      }
    },
    [quiz, quizWrong],
  );

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

  // 배경음악 엔진 준비(+ 음소거 설정 복원)
  useEffect(() => {
    const m = new GameMusic();
    musicRef.current = m;
    let saved = false;
    try {
      saved = localStorage.getItem("rabbit.game.muted") === "1";
    } catch {
      /* localStorage 접근 불가 시 무시 */
    }
    if (saved) {
      setMuted(true);
      m.setMuted(true);
    }
    return () => {
      m.dispose();
      musicRef.current = null;
    };
  }, []);

  const toggleMute = useCallback(() => {
    setMuted((prev) => {
      const next = !prev;
      musicRef.current?.setMuted(next);
      try {
        localStorage.setItem("rabbit.game.muted", next ? "1" : "0");
      } catch {
        /* 무시 */
      }
      return next;
    });
  }, []);

  // 게임 결과(완주/실패) 기록
  useEffect(() => {
    if (phase === "win" || phase === "lose") {
      musicRef.current?.stop(); // 결과 화면에서는 음악 정지(다시 시작 시 재생)
      sendLog([
        {
          feature: "game",
          mode: "result",
          session_id: gameSessionRef.current,
          meta: {
            event: "result",
            result: phase,
            quizzes_answered: gateCount.current,
          },
        },
      ]);
    }
  }, [phase]);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      const k = e.key;
      if (["ArrowUp", "ArrowLeft", "ArrowRight", " ", "Enter"].includes(k)) e.preventDefault();
      if (k === "Enter") {
        const p = phaseRef.current;
        if (p === "intro" || p === "win" || p === "lose") startGame();
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
  }, [startGame]);

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
      const jumpV = (inSea ? -10.6 : -13.2) * jumpMul.current;

      const left = keys.current["ArrowLeft"] || keys.current["a"];
      const right = keys.current["ArrowRight"] || keys.current["d"];
      const jump = keys.current["ArrowUp"] || keys.current[" "] || keys.current["w"];

      const footX0 = p.x + PW / 2;
      let inPuddle = false;
      let inHazard = false;
      if (p.onGround)
        for (const o of obstaclesRef.current)
          if (HAZARDS.has(o.type) && footX0 > o.x && footX0 < o.x + OB_W[o.type]) {
            inHazard = true;
            if (o.type === "puddle") inPuddle = true;
            // 가시덤불·성게는 밟으면 1회 크게 아프다(감속 + 자라 가속)
            if (
              (o.type === "thorns" || o.type === "urchin") &&
              !o.hit &&
              !slowImmune.current
            ) {
              o.hit = true;
              slowTimer.current = Math.max(slowTimer.current, 80);
              turtleMul.current *= 1.08;
            }
            break;
          }
      const slowed = slowTimer.current > 0 && !slowImmune.current;
      const hazardSlow = inHazard && !slowImmune.current;
      // 공중에서는 수평 속도를 줄여 점프 비거리를 짧게 한다(점프 높이는 그대로).
      const airFactor = p.onGround ? 1 : 0.72;
      const maxRun =
        RUN *
        speedMul.current *
        (slowed ? 0.5 : 1) *
        (hazardSlow ? 0.5 : 1) *
        airFactor;
      const acc = ACCEL * accelMul.current;
      if (right && !left) {
        p.vx = Math.min(maxRun, p.vx + acc);
        p.face = 1;
      } else if (left && !right) {
        p.vx = Math.max(-maxRun * 0.7, p.vx - acc);
        p.face = -1;
      } else {
        p.vx *= 0.8;
        if (Math.abs(p.vx) < 0.05) p.vx = 0;
      }
      if (jump && p.onGround) {
        p.vy = jumpV;
        p.onGround = false;
        musicRef.current?.sfxJump(); // 점프 효과음
      }

      p.vy += grav;
      if (p.vy > (inSea ? 9 : 17)) p.vy = inSea ? 9 : 17;

      prevX.current = p.x;
      let newX = p.x + p.vx;
      for (const o of obstaclesRef.current) {
        if (HAZARDS.has(o.type)) continue;
        const ow = OB_W[o.type];
        const otop = GROUND_Y - OB_H[o.type];
        if (newX + PW > o.x && p.x < o.x + ow && p.y + PH > otop + 6) newX = o.x - PW;
      }
      // 공중 얇은 단: 몸이 단 높이와 겹치면 옆에서 막힌다 → 점프해서 넘어가야 함
      for (const pl of PLATFORMS) {
        if (
          newX + PW > pl.x &&
          p.x < pl.x + pl.w &&
          p.y + PH > pl.y &&
          p.y < pl.y + PLAT_THICK
        )
          newX = pl.x - PW;
      }
      // 구덩이 벽: 구덩이 안(지면 아래)에서는 벽에 막혀 점프로만 탈출
      for (const f of TERRAIN) {
        if (f.type !== "pit") continue;
        if (p.y + PH > GROUND_Y + 2) {
          if (p.x + PW <= f.x + f.w && newX + PW > f.x + f.w)
            newX = f.x + f.w - PW;
          if (p.x >= f.x && newX < f.x) newX = f.x;
        }
      }
      p.x = Math.max(8, Math.min(GOAL + 40, newX));
      if (inPuddle && tRef.current % 6 === 0) spawnSplash(footX0, false);
      // 웅덩이에 '빠지는 순간'(처음 발이 닿을 때) 첨벙 효과음
      if (inPuddle && !wasInPuddle.current) musicRef.current?.sfxSplash();
      wasInPuddle.current = inPuddle;

      const prevBottom = p.y + PH;
      p.y += p.vy;
      p.onGround = false;
      const groundLevel = groundAt(p.x + PW / 2); // 지형(구덩이·구름다리) 반영
      if (p.y >= groundLevel - PH) {
        p.y = groundLevel - PH;
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
      // solid 장애물은 위에 올라설 수 있다(갇힘 방지 — 넘거나 올라타서 지나감)
      for (const o of obstaclesRef.current) {
        if (HAZARDS.has(o.type)) continue;
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
      if (prevX.current < SEA_START && p.x >= SEA_START) {
        spawnSplash(SEA_START, true);
        musicRef.current?.sfxSplash(true); // 풍덩! 큰 첨벙 효과음
      }
      if (prevX.current < SEA_END && p.x >= SEA_END) spawnSplash(SEA_END, false);
      if (splashText.current > 0) splashText.current -= 1;
      if (toastTimer.current > 0) toastTimer.current -= 1;
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
          setQuizWrong([]);
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

      // ===== 배경 그림으로 덮기(구간별): 용궁 → 산속 → 바다와 산 =====
      drawSectionBg(ctx, -VW, SEC, bgImgs.current[0], "#14616f");
      drawSectionBg(ctx, SEC, SEC * 2, bgImgs.current[1], "#cfe0cf");
      drawSectionBg(ctx, SEC * 2, GOAL + VW, bgImgs.current[2], "#cfe0e6");
      // 바닥선(캐릭터가 딛는 지면 표시)
      ctx.fillStyle = "rgba(30,22,12,0.16)";
      ctx.fillRect(cam, GROUND_Y + 20, VW, VH - GROUND_Y - 20);
      // 용궁(바닷속) 구간 거품
      for (let x = SEA_START + 40; x < SEA_END; x += 90) {
        if (x - cam < -20 || x - cam > VW + 20) continue;
        const by = GROUND_Y - 20 - ((t * 1.3 + x * 9) % 300);
        ctx.fillStyle = "rgba(220,245,255,0.4)";
        ctx.beginPath();
        ctx.arc(x + Math.sin((t + x) / 20) * 6, by, 2.2, 0, Math.PI * 2);
        ctx.fill();
      }

      // 지형(지하 구덩이 · 구름다리)
      for (const f of TERRAIN) {
        if (f.x + f.w - cam < -30 || f.x - cam > VW + 30) continue;
        drawTerrain(ctx, f);
      }

      // 공중 얇은 단(허들) + 반딧불
      for (const pl of PLATFORMS) {
        if (pl.x - cam < -140 || pl.x - cam > VW + 20) continue;
        // 바닥 그림자
        ctx.fillStyle = "rgba(0,0,0,0.12)";
        ctx.beginPath();
        ctx.ellipse(pl.x + pl.w / 2, GROUND_Y + 2, pl.w * 0.45, 5, 0, 0, Math.PI * 2);
        ctx.fill();
        // 얇은 단(공중에 떠 있음)
        ctx.fillStyle = "#6b4a2c";
        ctx.beginPath();
        ctx.roundRect(pl.x, pl.y, pl.w, PLAT_THICK, 5);
        ctx.fill();
        ctx.fillStyle = "#8a9a5b";
        ctx.fillRect(pl.x, pl.y, pl.w, 4);
        ctx.fillStyle = "#a7bd6b";
        ctx.fillRect(pl.x, pl.y, pl.w, 2);
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
      if (turtleImg.current)
        drawSprite(ctx, turtleImg.current, turtleX.current, Math.min(GROUND_Y, groundAt(turtleX.current)), true, 64);
      else drawTurtleMan(ctx, turtleX.current, t, 0);
      drawEquip(ctx, player.current);
      if (rabbitImg.current)
        drawSprite(
          ctx,
          rabbitImg.current,
          player.current.x + PW / 2,
          player.current.y + PH,
          player.current.face >= 0,
          72,
        );
      else drawRabbitGirl(ctx, player.current);

      ctx.restore();

      if (splashText.current > 0) {
        ctx.fillStyle = "#145";
        ctx.font = "bold 34px system-ui, 'Malgun Gothic'";
        ctx.textAlign = "center";
        ctx.fillText("풍덩! 🌊", VW / 2, 130);
        ctx.textAlign = "left";
      }

      if (toastTimer.current > 0) {
        ctx.save();
        ctx.globalAlpha = Math.min(1, toastTimer.current / 25);
        ctx.textAlign = "center";
        ctx.font = "bold 30px system-ui, 'Malgun Gothic'";
        ctx.lineWidth = 5;
        ctx.strokeStyle = "rgba(255,255,255,0.9)";
        ctx.strokeText(toastText.current, VW / 2, 120);
        ctx.fillStyle = toastColor.current;
        ctx.fillText(toastText.current, VW / 2, 120);
        ctx.restore();
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
    const w = OB_W[o.type];
    const h = OB_H[o.type];
    if (o.type === "puddle") {
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
    } else if (o.type === "log") {
      // 쓰러진 통나무 — 고목 그림이 준비되면 그걸로(충돌 박스보다 살짝 넓게·지면에 맞춤)
      if (LOG_IMG) {
        const DW = w * 1.3;
        const DH = DW * (LOG_IMG.height / LOG_IMG.width);
        c.drawImage(LOG_IMG, o.x + w / 2 - DW / 2, GROUND_Y - DH, DW, DH);
      } else {
        // (폴백) 벡터 통나무
        const top = GROUND_Y - h;
        const g = c.createLinearGradient(0, top, 0, GROUND_Y);
        g.addColorStop(0, "#b4824c");
        g.addColorStop(1, "#7a5329");
        c.fillStyle = g;
        c.beginPath();
        c.roundRect(o.x, top, w, h, h / 2);
        c.fill();
        c.strokeStyle = "#5e3f1f";
        c.lineWidth = 1.5;
        c.beginPath();
        c.ellipse(o.x + 11, top + h / 2, 5, h / 2 - 2, 0, 0, Math.PI * 2);
        c.stroke();
        c.fillStyle = "#cd9a5f";
        c.beginPath();
        c.ellipse(o.x + 11, top + h / 2, 2.4, h / 2 - 6, 0, 0, Math.PI * 2);
        c.fill();
      }
    } else if (o.type === "stump") {
      // 나무 그루터기 (높아서 더 높이 점프)
      const top = GROUND_Y - h;
      const g = c.createLinearGradient(o.x, 0, o.x + w, 0);
      g.addColorStop(0, "#6b4423");
      g.addColorStop(0.5, "#9c6b3c");
      g.addColorStop(1, "#6b4423");
      c.fillStyle = g;
      c.fillRect(o.x + 3, top + 6, w - 6, h - 6);
      c.strokeStyle = "#5e3f1f";
      c.lineWidth = 1.2;
      c.beginPath();
      c.moveTo(o.x + w * 0.38, top + 10);
      c.lineTo(o.x + w * 0.38, GROUND_Y - 2);
      c.moveTo(o.x + w * 0.66, top + 10);
      c.lineTo(o.x + w * 0.66, GROUND_Y - 2);
      c.stroke();
      c.fillStyle = "#c59a63";
      c.beginPath();
      c.ellipse(o.x + w / 2, top + 6, w / 2 - 3, 6, 0, 0, Math.PI * 2);
      c.fill();
      c.strokeStyle = "#8a6436";
      c.beginPath();
      c.ellipse(o.x + w / 2, top + 6, w / 2 - 9, 3.5, 0, 0, Math.PI * 2);
      c.stroke();
    } else if (o.type === "thorns") {
      // 가시덤불 (밟으면 아픔 — 뛰어넘기!)
      const vh = 26;
      c.fillStyle = "#3f6b3a";
      c.beginPath();
      c.ellipse(o.x + w / 2, GROUND_Y - 3, w / 2, 9, 0, 0, Math.PI * 2);
      c.fill();
      c.strokeStyle = "#2f5230";
      c.lineWidth = 2;
      for (let i = 0; i <= 6; i++) {
        const sx = o.x + 6 + (i * (w - 12)) / 6;
        c.beginPath();
        c.moveTo(sx, GROUND_Y - 5);
        c.lineTo(sx - 3, GROUND_Y - vh + (i % 2) * 6);
        c.stroke();
      }
      c.fillStyle = "#c0392b";
      for (let i = 0; i < 4; i++) {
        c.beginPath();
        c.arc(o.x + 10 + i * 11, GROUND_Y - 8 - (i % 2) * 5, 2, 0, Math.PI * 2);
        c.fill();
      }
    } else if (o.type === "coral") {
      // 산호 (바닷속 — 넘거나 올라타기)
      const top = GROUND_Y - h;
      c.strokeStyle = "#e8743b";
      c.lineWidth = 6;
      c.lineCap = "round";
      c.beginPath();
      c.moveTo(o.x + w / 2, GROUND_Y);
      c.lineTo(o.x + w / 2, top + 8);
      c.moveTo(o.x + w / 2, top + 24);
      c.lineTo(o.x + 7, top + 6);
      c.moveTo(o.x + w / 2, top + 30);
      c.lineTo(o.x + w - 7, top + 10);
      c.stroke();
      c.fillStyle = "#f6a06a";
      for (const [bx, by] of [
        [o.x + w / 2, top + 6],
        [o.x + 7, top + 5],
        [o.x + w - 7, top + 9],
      ] as const) {
        c.beginPath();
        c.arc(bx, by, 4, 0, Math.PI * 2);
        c.fill();
      }
      c.lineCap = "butt";
    } else if (o.type === "urchin") {
      // 성게 (밟으면 아픔 — 뛰어넘기!)
      const cx = o.x + w / 2;
      const cy = GROUND_Y - 9;
      const r = 9;
      c.strokeStyle = "#4a2f5c";
      c.lineWidth = 2;
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2;
        c.beginPath();
        c.moveTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r * 0.8);
        c.lineTo(cx + Math.cos(a) * (r + 8), cy + Math.sin(a) * (r + 8) * 0.8);
        c.stroke();
      }
      const g = c.createRadialGradient(cx - 2, cy - 2, 2, cx, cy, r);
      g.addColorStop(0, "#9b6aad");
      g.addColorStop(1, "#5b3a6b");
      c.fillStyle = g;
      c.beginPath();
      c.ellipse(cx, cy, r, r * 0.8, 0, 0, Math.PI * 2);
      c.fill();
    } else {
      // rock — 바위 그림이 준비되면 그걸로(충돌 박스보다 살짝 넓게·지면에 맞춤)
      if (ROCK_IMG) {
        const DW = w * 1.5;
        const DH = DW * (ROCK_IMG.height / ROCK_IMG.width);
        c.drawImage(ROCK_IMG, o.x + w / 2 - DW / 2, GROUND_Y - DH, DW, DH);
      } else {
        // (폴백) 벡터 바위
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

  // 캐릭터 스프라이트를 바닥(baseY)에 발을 맞춰 그린다. faceRight=false면 좌우 반전.
  function drawSprite(
    c: CanvasRenderingContext2D,
    cv: HTMLCanvasElement,
    cx: number,
    baseY: number,
    faceRight: boolean,
    targetH: number,
  ) {
    const sc = targetH / cv.height;
    const wdt = cv.width * sc;
    c.save();
    c.fillStyle = "rgba(0,0,0,0.16)";
    c.beginPath();
    c.ellipse(cx, baseY + 2, Math.max(10, wdt * 0.34), 4.5, 0, 0, Math.PI * 2);
    c.fill();
    c.translate(cx, baseY);
    if (!faceRight) c.scale(-1, 1);
    c.drawImage(cv, -wdt / 2, -targetH, wdt, targetH);
    c.restore();
  }

  // 장착 아이템 시각 효과(토끼 뒤/주변)
  function drawEquip(
    c: CanvasRenderingContext2D,
    p: { x: number; y: number },
  ) {
    const eq = new Set(equippedRef.current);
    const x = p.x + PW / 2;
    const y = p.y;
    if (eq.has("shield")) {
      c.save();
      c.strokeStyle = "rgba(90,180,255,0.6)";
      c.lineWidth = 2.5;
      c.beginPath();
      c.arc(x, y + 16, 26, 0, Math.PI * 2);
      c.stroke();
      c.restore();
    }
    if (eq.has("wings")) {
      const flap = Math.sin(tRef.current / 5) * 0.3;
      c.save();
      c.fillStyle = "rgba(255,255,255,0.95)";
      c.strokeStyle = "#cdd6e2";
      c.lineWidth = 1;
      for (const s of [-1, 1]) {
        c.beginPath();
        c.ellipse(x + s * 13, y + 20, 7, 13, s * (0.6 + flap), 0, Math.PI * 2);
        c.fill();
        c.stroke();
      }
      c.restore();
    }
    if (eq.has("star")) {
      c.save();
      c.font = "14px system-ui";
      c.textAlign = "center";
      c.fillText("⭐", x, y - 24 + Math.sin(tRef.current / 8) * 2);
      c.textAlign = "left";
      c.restore();
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
        <button
          className="fs-btn"
          onClick={toggleMute}
          title={muted ? "소리 켜기" : "소리 끄기"}
        >
          {muted ? "🔇 소리" : "🔊 소리"}
        </button>
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
            <div className="game-panel intro-panel">
              <h2 className="intro-title">토끼 vs 자라 경주</h2>
              <p className="intro-line">
                ⭕ 정답 → <b>내 속도 UP</b> 🐰
                <br />❌ 오답 → <b>자라 속도 UP</b> 🐢
              </p>
              <p className="intro-line intro-controls">
                ← → 걷기 · <b>Space(또는 ↑) 점프</b>
              </p>

              <button className="btn intro-start" onClick={startGame}>
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
                {quiz.options.map((op, i) => {
                  const wrong = quizWrong.includes(i);
                  return (
                    <button
                      key={i}
                      className={`quiz-opt ${wrong ? "wrong" : ""}`}
                      onClick={() => answerQuiz(i)}
                      disabled={wrong}
                    >
                      {op}
                    </button>
                  );
                })}
              </div>
              {quizWrong.length > 0 && (
                <p className="quiz-retry">앗, 틀렸어요. 다시 골라 보세요! 🙂</p>
              )}
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
                <a className="btn ghost" href="/remix">
                  ✨ 이야기 바꾸기 →
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
                <a className="btn ghost" href="/remix">
                  ✨ 이야기 바꾸기 →
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
