"use client";

import { useState, type ReactNode } from "react";

/**
 * 「줄거리 보기」 — 튜터가 먼저 『토끼전』 내용을 TOPIK 4급 수준으로 설명한다.
 * 10개 장면을 귀여운 그림책풍 SVG 일러스트로 보여주며 사건 전개를 자세히 설명.
 * 주제·교훈은 넣지 않는다(원리4). 사건·어휘 중심(원리1·2).
 */

interface Scene {
  title: string;
  text: string;
  words: [string, string][];
}

const SCENES: Scene[] = [
  {
    title: "① 깊은 병에 걸린 용왕",
    text: "먼 옛날, 바닷속 용궁을 다스리던 용왕이 그만 깊은 병에 걸리고 말았어요. 이름난 의원들이 온갖 약을 지어 올렸지만, 용왕의 병세는 좀처럼 나아지지 않았지요. 하루하루 기운이 빠진 용왕은 마침내 자리에 눕고 말았어요.",
    words: [
      ["다스리다", "나라나 백성을 맡아 보살피고 이끌다"],
      ["병세", "병의 상태"],
      ["좀처럼", "여간해서는 (쉽게)"],
      ["자리에 눕다", "병으로 앓아눕다"],
    ],
  },
  {
    title: "② 토끼의 간이 명약이라니",
    text: "그러던 어느 날, 한 늙은 의원이 조심스레 아뢰었어요. “토끼의 간을 구해 드시면 반드시 효험을 보실 것입니다.” 신하들은 그 말에 술렁였어요. 토끼는 바다가 아닌 육지에 사는 동물이라, 간을 구하기가 결코 쉽지 않았기 때문이에요.",
    words: [
      ["아뢰다", "윗사람에게 말씀드리다"],
      ["효험", "약이나 치료의 좋은 효과"],
      ["술렁이다", "여럿이 수군대며 소란스러워지다"],
      ["결코", "절대로 (부정과 함께 씀)"],
    ],
  },
  {
    title: "③ 자원하여 나선 별주부",
    text: "신하들은 서로 눈치만 살필 뿐, 선뜻 나서는 이가 없었어요. 험한 육지까지 가는 일이 몹시 두려웠던 탓이지요. 바로 그때, 별주부 자라가 앞으로 나서며 아뢰었어요. “부족하나마 제가 다녀오겠나이다.” 용왕은 그 충성심에 크게 감동했어요.",
    words: [
      ["자원하다", "스스로 원해서 나서다"],
      ["선뜻", "망설이지 않고 얼른"],
      ["-(으)ㄴ 탓", "어떤 일의 원인이나 까닭"],
      ["충성심", "마음을 다해 따르고 섬기는 마음"],
    ],
  },
  {
    title: "④ 머나먼 육지로",
    text: "별주부는 토끼의 모습을 그린 그림을 품에 넣고 긴 여정에 올랐어요. 거센 물살을 가르고 높은 파도를 넘으며 밤낮없이 헤엄쳤지요. 마침내 낯선 육지에 다다른 자라는 울창한 숲속을 두리번거리며 토끼를 찾아 나섰어요.",
    words: [
      ["여정", "여행의 과정이나 길"],
      ["거세다", "기세가 매우 세다"],
      ["밤낮없이", "쉬지 않고 계속"],
      ["울창하다", "나무가 빽빽하게 우거지다"],
      ["다다르다", "목적한 곳에 이르다"],
    ],
  },
  {
    title: "⑤ 숲에서 만난 토끼",
    text: "한참을 헤매던 끝에, 자라는 깡충깡충 뛰노는 토끼와 마주쳤어요. 자라는 공손히 허리를 숙이며 말을 건넸어요. “토끼 선생, 반갑습니다. 좋은 소식을 전하러 먼 길을 왔습니다.” 난데없는 인사에 토끼는 고개를 갸웃거렸어요.",
    words: [
      ["헤매다", "길을 몰라 이리저리 돌아다니다"],
      ["마주치다", "우연히 만나다"],
      ["공손히", "예의 바르고 겸손하게"],
      ["난데없다", "갑작스럽고 뜻밖이다"],
    ],
  },
  {
    title: "⑥ 달콤한 말로 꾀다",
    text: "자라는 그럴듯한 말로 토끼를 구슬리기 시작했어요. “용궁에 가시면 산해진미가 넘쳐나고, 높은 벼슬까지 얻으실 수 있습니다.” 그 말에 토끼는 그만 욕심에 눈이 멀고 말았지요. 결국 토끼는 자라를 따라나서기로 마음먹었어요.",
    words: [
      ["그럴듯하다", "제법 믿을 만해 보이다"],
      ["구슬리다", "남을 달래어 꾀다"],
      ["산해진미", "온갖 귀하고 맛있는 음식"],
      ["눈이 멀다", "이성을 잃을 만큼 빠지다"],
    ],
  },
  {
    title: "⑦ 용궁으로 가는 길",
    text: "토끼는 자라의 등에 올라탔고, 자라는 망설임 없이 바닷속으로 풍덩 뛰어들었어요. 눈앞에 펼쳐진 바닷속 풍경은 그야말로 별천지였지요. 형형색색의 산호와 물고기 떼가 토끼의 넋을 빼놓았어요. 그렇게 토끼는 마침내 으리으리한 용궁에 발을 들였어요.",
    words: [
      ["별천지", "아주 특별하고 색다른 세상"],
      ["형형색색", "가지각색의 여러 빛깔"],
      ["넋을 빼놓다", "정신을 잃을 만큼 사로잡다"],
      ["으리으리하다", "웅장하고 화려하다"],
    ],
  },
  {
    title: "⑧ 뒤바뀐 상황",
    text: "그런데 용궁의 분위기가 어쩐지 심상치 않았어요. 용왕은 서슬 퍼런 얼굴로 호령했어요. “당장 네 간을 내놓아라! 그것이 과인의 약이니라.” 토끼는 그제야 자신이 감쪽같이 속아 넘어왔음을 깨닫고 간담이 서늘해졌어요.",
    words: [
      ["심상치 않다", "예사롭지 않고 수상하다"],
      ["서슬 퍼렇다", "기세가 매우 날카롭고 무섭다"],
      ["감쪽같이", "아무도 모르게 완벽히"],
      ["간담이 서늘하다", "몹시 놀라고 겁이 나다"],
    ],
  },
  {
    title: "⑨ 위기를 넘기는 지혜",
    text: "두려움 속에서도 토끼는 정신을 바짝 차리고 한 가지 꾀를 떠올렸어요. “실은 제 간은 몸속이 아니라 밖에 있습니다. 깨끗이 씻어 볕 좋은 육지에 고이 두고 왔지요.” 그럴싸한 말에 용왕은 감쪽같이 넘어가, 토끼를 서둘러 육지로 돌려보내기로 했어요.",
    words: [
      ["바짝", "아주 긴장하여 세게"],
      ["떠올리다", "생각을 머리에 나타내다"],
      ["고이", "소중하게 정성껏"],
      ["넘어가다", "속임수에 속다"],
    ],
  },
  {
    title: "⑩ 유유히 사라진 토끼",
    text: "자라는 토끼를 등에 업고 다시 육지로 헤엄쳐 나왔어요. 땅에 발을 딛자마자 토끼는 통쾌하게 웃음을 터뜨렸지요. “세상에 간을 몸 밖에 두고 다니는 짐승이 어디 있단 말이오!” 토끼는 그 길로 쏜살같이 숲으로 자취를 감추었고, 자라는 그저 멍하니 바라볼 수밖에 없었어요.",
    words: [
      ["통쾌하다", "아주 시원하고 유쾌하다"],
      ["쏜살같이", "화살처럼 매우 빠르게"],
      ["자취를 감추다", "흔적도 없이 사라지다"],
      ["그저", "다른 도리 없이 그냥"],
    ],
  },
];

/**
 * 장면별 수채화 이미지(있으면 SVG 대신 사용). 받는 대로 한 칸씩 채운다.
 * null인 장면은 기존 그림책풍 SVG가 그대로 나온다.
 */
const SCENE_IMG: (string | null)[] = [
  "/assets/story/01.webp", // ① 깊은 병에 걸린 용왕
  "/assets/story/02.webp", // ②
  "/assets/story/03.webp", // ③
  "/assets/story/04.webp", // ④
  "/assets/story/05.webp", // ⑤
  "/assets/story/06.webp", // ⑥
  "/assets/story/07.webp", // ⑦
  "/assets/story/08.webp", // ⑧
  "/assets/story/09.webp", // ⑨
  "/assets/story/10.webp", // ⑩
];

/* ===== 공용 SVG 조각 (그림책풍) ===== */
function ForestBg() {
  return (
    <>
      <defs>
        <linearGradient id="fsky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffe3bf" />
          <stop offset="0.5" stopColor="#fff2df" />
          <stop offset="1" stopColor="#e3f1e2" />
        </linearGradient>
        <radialGradient id="fsun" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#ffe6a8" stopOpacity="0.9" />
          <stop offset="1" stopColor="#ffe6a8" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect x="0" y="0" width="320" height="190" fill="url(#fsky)" />
      <circle cx="256" cy="44" r="46" fill="url(#fsun)" />
      <circle cx="256" cy="44" r="17" fill="#ffcf6b" />
      <path d="M0,116 Q70,74 140,112 T320,112 L320,150 L0,150 Z" fill="#bcd9b6" />
      <path d="M0,130 Q90,96 180,126 T320,128 L320,150 L0,150 Z" fill="#9ec89a" />
      <g fill="#6ba557">
        <ellipse cx="38" cy="151" rx="30" ry="16" />
        <ellipse cx="300" cy="151" rx="34" ry="18" />
      </g>
      <rect x="0" y="150" width="320" height="40" fill="#8fb45f" />
      <rect x="0" y="150" width="320" height="5" fill="#7ea551" />
      <g stroke="#6f9a44" strokeWidth="2" strokeLinecap="round">
        <path d="M70,150 l0,-6 M74,150 l3,-5 M66,150 l-3,-5" />
        <path d="M250,150 l0,-6 M254,150 l3,-5 M246,150 l-3,-5" />
      </g>
      <g fill="#fff6cf">
        <circle cx="120" cy="38" r="1.5" />
        <circle cx="180" cy="58" r="1.2" />
        <circle cx="92" cy="78" r="1.2" />
      </g>
    </>
  );
}

function Tree({ x }: { x: number }) {
  return (
    <g>
      <rect x={x - 5} y="108" width="10" height="44" rx="3" fill="#8a6a3e" />
      <circle cx={x} cy="98" r="22" fill="#5f9a4a" />
      <circle cx={x - 15} cy="108" r="14" fill="#6faa56" />
      <circle cx={x + 15} cy="108" r="14" fill="#6faa56" />
      <circle cx={x - 6} cy="92" r="5" fill="#7fba66" opacity="0.6" />
    </g>
  );
}

function Flower({ x, y, c }: { x: number; y: number; c: string }) {
  return (
    <g>
      <g fill={c}>
        {[0, 1, 2, 3, 4].map((i) => {
          const a = (i / 5) * Math.PI * 2;
          return <circle key={i} cx={x + Math.cos(a) * 4.5} cy={y + Math.sin(a) * 4.5} r="2.6" />;
        })}
      </g>
      <circle cx={x} cy={y} r="1.8" fill="#fff6cf" />
    </g>
  );
}

function SeaBg({ palace = false }: { palace?: boolean }) {
  return (
    <>
      <defs>
        <linearGradient id="ssea" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#56b6c4" />
          <stop offset="0.5" stopColor="#2b86a0" />
          <stop offset="1" stopColor="#103e52" />
        </linearGradient>
        <radialGradient id="slight" cx="0.5" cy="0" r="0.8">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.35" />
          <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect x="0" y="0" width="320" height="190" fill="url(#ssea)" />
      <rect x="0" y="0" width="320" height="190" fill="url(#slight)" />
      <g fill="#ddfdff" opacity="0.12">
        <polygon points="70,0 100,0 140,190 90,190" />
        <polygon points="190,0 220,0 260,190 210,190" />
      </g>
      {palace && (
        <g opacity="0.82">
          <rect x="112" y="56" width="96" height="74" rx="4" fill="#2d6b79" />
          <rect x="122" y="66" width="11" height="64" fill="#b23b2e" />
          <rect x="187" y="66" width="11" height="64" fill="#b23b2e" />
          <path d="M100,56 L160,24 L220,56 Z" fill="#e6b24a" />
          <path d="M106,56 L160,30 L214,56" fill="none" stroke="#c6922f" strokeWidth="2" />
          <rect x="150" y="96" width="20" height="34" rx="2" fill="#123b44" />
          <circle cx="160" cy="20" r="3" fill="#ffd36b" />
        </g>
      )}
      <g stroke="#53c58a" strokeWidth="4" strokeLinecap="round" fill="none" opacity="0.8">
        <path d="M26,150 q9,-22 0,-44 q-8,-16 2,-30" />
        <path d="M300,150 q-9,-20 0,-42 q8,-14 -2,-28" />
      </g>
      <g strokeLinecap="round">
        <path d="M52,150 l0,-18 M52,140 l-9,-9 M52,138 l9,-11" stroke="#e86f9e" strokeWidth="3.5" />
        <path d="M268,150 l0,-16 M268,142 l8,-8 M268,140 l-8,-9" stroke="#b06fd0" strokeWidth="3.5" />
      </g>
      <g fill="#dff6ff" opacity="0.6">
        <circle cx="70" cy="60" r="3.5" />
        <circle cx="250" cy="80" r="3" />
        <circle cx="200" cy="40" r="2.2" />
        <circle cx="110" cy="46" r="2" />
        <circle cx="150" cy="70" r="2.4" />
        <circle cx="285" cy="52" r="2" />
      </g>
      <rect x="0" y="150" width="320" height="40" fill="#1f6f86" />
      <rect x="0" y="150" width="320" height="5" fill="#2f93a6" />
      <g fill="#155b70">
        <circle cx="60" cy="163" r="3" />
        <circle cx="140" cy="167" r="2.4" />
        <circle cx="230" cy="161" r="3" />
      </g>
    </>
  );
}

function Rabbit({ x, feet = 150, flip = false }: { x: number; feet?: number; flip?: boolean }) {
  const s = flip ? -1 : 1;
  return (
    <g transform={`translate(${x},${feet}) scale(${s},1)`}>
      <ellipse cx="0" cy="2" rx="14" ry="3.5" fill="rgba(0,0,0,0.14)" />
      <ellipse cx="-5" cy="-1" rx="4" ry="3" fill="#fff" stroke="#ead9cf" strokeWidth="1.2" />
      <ellipse cx="5" cy="-1" rx="4" ry="3" fill="#fff" stroke="#ead9cf" strokeWidth="1.2" />
      <ellipse cx="0" cy="-12" rx="10" ry="12" fill="#ffffff" stroke="#ead9cf" strokeWidth="1.6" />
      <path d="M-7,-20 L0,-17 L7,-20 L5,-13 L-5,-13 Z" fill="#ff8fbf" />
      <circle cx="0" cy="-17" r="2.2" fill="#ff6fa8" />
      <circle cx="0" cy="-31" r="12.5" fill="#ffffff" stroke="#ead9cf" strokeWidth="1.6" />
      <g stroke="#ead9cf" strokeWidth="1.4">
        <ellipse cx="-5" cy="-47" rx="3.6" ry="11.5" fill="#fff" transform="rotate(-10 -5 -47)" />
        <ellipse cx="5" cy="-47" rx="3.6" ry="11.5" fill="#fff" transform="rotate(10 5 -47)" />
      </g>
      <ellipse cx="-5" cy="-47" rx="1.5" ry="7.5" fill="#ffc4da" transform="rotate(-10 -5 -47)" />
      <ellipse cx="5" cy="-47" rx="1.5" ry="7.5" fill="#ffc4da" transform="rotate(10 5 -47)" />
      <circle cx="-7.5" cy="-28" r="3.2" fill="#ffb3cf" />
      <circle cx="7.5" cy="-28" r="3.2" fill="#ffb3cf" />
      <ellipse cx="-4.5" cy="-32" rx="2.6" ry="3.6" fill="#4a3330" />
      <ellipse cx="4.5" cy="-32" rx="2.6" ry="3.6" fill="#4a3330" />
      <circle cx="-3.6" cy="-33.6" r="1.1" fill="#fff" />
      <circle cx="5.4" cy="-33.6" r="1.1" fill="#fff" />
      <path d="M-1.8,-27 L1.8,-27 L0,-25 Z" fill="#ff7aa8" />
      <rect x="-2.2" y="-25" width="4.4" height="3.4" rx="1.2" fill="#fff" stroke="#ead9cf" strokeWidth="0.7" />
      <line x1="0" y1="-25" x2="0" y2="-21.6" stroke="#ead9cf" strokeWidth="0.7" />
    </g>
  );
}

function Turtle({ x, feet = 150, flip = false }: { x: number; feet?: number; flip?: boolean }) {
  const s = flip ? -1 : 1;
  return (
    <g transform={`translate(${x},${feet}) scale(${s},1)`}>
      <ellipse cx="0" cy="2" rx="18" ry="3.5" fill="rgba(0,0,0,0.14)" />
      <ellipse cx="-10" cy="-2" rx="3.4" ry="4.2" fill="#5f9a54" />
      <ellipse cx="10" cy="-2" rx="3.4" ry="4.2" fill="#5f9a54" />
      <ellipse cx="0" cy="-11" rx="16" ry="12.5" fill="#7cae5a" stroke="#4f7a36" strokeWidth="2" />
      <ellipse cx="0" cy="-13" rx="12" ry="8.5" fill="#9ece6e" />
      <g fill="#6b9a44">
        <circle cx="-8" cy="-12" r="2.6" />
        <circle cx="0" cy="-15" r="2.6" />
        <circle cx="8" cy="-12" r="2.6" />
        <circle cx="-4" cy="-8" r="2.2" />
        <circle cx="4" cy="-8" r="2.2" />
      </g>
      <path d="M9,-6 q5,3 9,1" stroke="#cdbf9a" strokeWidth="2.5" fill="none" />
      <circle cx="15" cy="-15" r="7.5" fill="#8cbf6c" stroke="#4f7a36" strokeWidth="1.4" />
      <circle cx="11.5" cy="-12" r="2.2" fill="#ff9ec4" opacity="0.75" />
      <ellipse cx="17" cy="-16" rx="1.7" ry="2.2" fill="#2b3b22" />
      <circle cx="17.7" cy="-16.8" r="0.6" fill="#fff" />
      <ellipse cx="15" cy="-22" rx="9" ry="2.6" fill="#2a2a30" />
      <path d="M10,-22 q5,-7 10,0 Z" fill="#1f1f26" />
    </g>
  );
}

function King({ x, feet = 150 }: { x: number; feet?: number }) {
  return (
    <g transform={`translate(${x},${feet})`}>
      <ellipse cx="0" cy="2" rx="18" ry="4" fill="rgba(0,0,0,0.15)" />
      <path d="M-15,-2 Q-18,-28 -12,-34 Q0,-40 12,-34 Q18,-28 15,-2 Z" fill="#2f7fa0" stroke="#1d5b76" strokeWidth="1.6" />
      <path d="M-5,-34 L0,-24 L5,-34" stroke="#ffe3a8" strokeWidth="2.5" fill="none" />
      <circle cx="0" cy="-42" r="12.5" fill="#cfe8c8" stroke="#8fb98a" strokeWidth="1.4" />
      <path d="M-9,-52 l-4,-7 l6,3 Z" fill="#e6b93c" />
      <path d="M9,-52 l4,-7 l-6,3 Z" fill="#e6b93c" />
      <circle cx="-7" cy="-39" r="2.6" fill="#f3a6a0" opacity="0.7" />
      <circle cx="7" cy="-39" r="2.6" fill="#f3a6a0" opacity="0.7" />
      <ellipse cx="-4.5" cy="-43" rx="2" ry="2.8" fill="#2b2b2b" />
      <ellipse cx="4.5" cy="-43" rx="2" ry="2.8" fill="#2b2b2b" />
      <circle cx="-3.8" cy="-44" r="0.7" fill="#fff" />
      <circle cx="5.2" cy="-44" r="0.7" fill="#fff" />
      <path d="M-6,-36 Q0,-26 6,-36 Q3,-31 0,-31 Q-3,-31 -6,-36 Z" fill="#f2f2f2" />
      <path d="M-12,-52 l0,-7 l5,4 l4,-8 l4,8 l5,-4 l0,7 Z" fill="#f0c53b" stroke="#c99a1e" strokeWidth="1" />
      <circle cx="0" cy="-57" r="1.5" fill="#e4572e" />
    </g>
  );
}

function Bubble({ x, y, w, text, color = "#2f7a53" }: { x: number; y: number; w: number; text: string; color?: string }) {
  return (
    <g>
      <rect x={x} y={y} width={w} height="26" rx="12" fill="#fff" stroke="#e4ddd0" strokeWidth="1.4" />
      <path d={`M${x + 16},${y + 26} l-7,11 l15,-9 Z`} fill="#fff" stroke="#e4ddd0" strokeWidth="1.4" />
      <text x={x + w / 2} y={y + 17} fontSize="12" fill={color} fontWeight="700" textAnchor="middle">
        {text}
      </text>
    </g>
  );
}

function Label({ x, text, dark = false }: { x: number; text: string; dark?: boolean }) {
  return (
    <g>
      <rect x={x - 26} y="168" width="52" height="17" rx="8" fill={dark ? "rgba(0,0,0,0.3)" : "rgba(255,255,255,0.75)"} />
      <text x={x} y="180" fontSize="11.5" fill={dark ? "#fff" : "#20304a"} fontWeight="700" textAnchor="middle">
        {text}
      </text>
    </g>
  );
}

function SceneArt({ index }: { index: number }) {
  const svg = (children: ReactNode) => (
    <svg viewBox="0 0 320 190" preserveAspectRatio="xMidYMid meet" width="100%" height="100%">
      {children}
    </svg>
  );

  switch (index) {
    case 0: // 용왕의 병
      return svg(
        <>
          <SeaBg palace />
          <King x={160} feet={150} />
          <text x="150" y="98" fontSize="18">😣</text>
          <text x="176" y="92" fontSize="13">💦</text>
          <Label x={160} text="아픈 용왕" dark />
        </>,
      );
    case 1: // 토끼 간이 약
      return svg(
        <>
          <SeaBg />
          <King x={78} feet={150} />
          <g>
            <ellipse cx="238" cy="52" rx="42" ry="28" fill="#fff" opacity="0.95" />
            <circle cx="206" cy="86" r="5" fill="#fff" opacity="0.9" />
            <circle cx="196" cy="100" r="3" fill="#fff" opacity="0.9" />
            <g transform="translate(236,70) scale(0.62)">
              <Rabbit x={0} feet={0} />
            </g>
            <text x="262" y="50" fontSize="13" fill="#c0392b" fontWeight="700">간?</text>
          </g>
          <Bubble x={112} y={40} w={96} text="토끼의 간이 약!" color="#c0392b" />
          <Label x={78} text="의원·신하" dark />
        </>,
      );
    case 2: // 자라가 나서다
      return svg(
        <>
          <SeaBg palace />
          <King x={66} feet={150} />
          <Turtle x={214} feet={150} flip />
          <Bubble x={120} y={66} w={110} text="제가 가겠습니다!" />
          <Label x={66} text="용왕" dark />
          <Label x={214} text="별주부 자라" dark />
        </>,
      );
    case 3: // 자라 육지로 떠남
      return svg(
        <>
          <defs>
            <linearGradient id="s4" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#ffe3bf" />
              <stop offset="0.5" stopColor="#bfe3d6" />
              <stop offset="1" stopColor="#2b86a0" />
            </linearGradient>
          </defs>
          <rect width="320" height="190" fill="url(#s4)" />
          <circle cx="272" cy="38" r="18" fill="#ffcf6b" />
          <rect x="0" y="118" width="320" height="72" fill="#3f9fb0" />
          <path d="M238,118 q46,-22 82,-6 L320,190 L238,190 Z" fill="#8fb45f" />
          <Tree x={290} />
          <path d="M70,108 q70,-26 150,-4" stroke="#fff" strokeWidth="3" fill="none" strokeDasharray="7 6" strokeLinecap="round" />
          <path d="M218,98 l12,8 l-13,5 Z" fill="#fff" />
          <g fill="#dff6ff" opacity="0.7">
            <circle cx="120" cy="150" r="3" />
            <circle cx="150" cy="140" r="2" />
          </g>
          <Turtle x={92} feet={150} />
          <Label x={92} text="자라 (육지로!)" dark />
        </>,
      );
    case 4: // 만남
      return svg(
        <>
          <ForestBg />
          <Tree x={34} />
          <Flower x={120} y={160} c="#e4572e" />
          <Flower x={176} y={162} c="#f2b705" />
          <Flower x={262} y={160} c="#d6509e" />
          <Turtle x={96} feet={150} />
          <Rabbit x={232} feet={150} flip />
          <Bubble x={118} y={70} w={100} text="안녕하세요 🙇" />
          <Label x={84} text="별주부 자라" />
          <Label x={236} text="토끼" />
        </>,
      );
    case 5: // 꾐
      return svg(
        <>
          <ForestBg />
          <Tree x={292} />
          <Turtle x={96} feet={150} />
          <Rabbit x={224} feet={150} flip />
          <g>
            <rect x="108" y="64" width="108" height="30" rx="12" fill="#fff" stroke="#e4ddd0" strokeWidth="1.4" />
            <path d="M126,94 l-7,11 l15,-8 Z" fill="#fff" stroke="#e4ddd0" strokeWidth="1.4" />
            <path d="M118,86 L126,78 L134,86 Z" fill="#e6b24a" />
            <rect x="120" y="86" width="12" height="6" fill="#c0392b" />
            <text x="170" y="83" fontSize="12" fill="#2f7a53" fontWeight="700" textAnchor="middle">용궁·벼슬 ✨</text>
          </g>
          <Label x={84} text="자라(꾐)" />
          <Label x={228} text="토끼" />
        </>,
      );
    case 6: // 용궁으로 풍덩
      return svg(
        <>
          <defs>
            <linearGradient id="s7" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#ffe3bf" />
              <stop offset="0.32" stopColor="#bfe3d6" />
              <stop offset="1" stopColor="#103e52" />
            </linearGradient>
          </defs>
          <rect width="320" height="190" fill="url(#s7)" />
          <rect x="0" y="78" width="320" height="112" fill="#2b86a0" opacity="0.85" />
          <g fill="#eafaff" opacity="0.9">
            <circle cx="150" cy="78" r="6" />
            <circle cx="168" cy="68" r="4.5" />
            <circle cx="134" cy="70" r="4" />
            <circle cx="182" cy="80" r="3.5" />
            <circle cx="120" cy="80" r="3" />
          </g>
          <text x="196" y="66" fontSize="18" fill="#145" fontWeight="700">풍덩!</text>
          <g fill="#dff6ff" opacity="0.6">
            <circle cx="90" cy="130" r="3" />
            <circle cx="230" cy="120" r="2.5" />
            <circle cx="260" cy="150" r="3" />
          </g>
          <Turtle x={150} feet={152} />
          <g transform="translate(150,139) scale(0.66)">
            <Rabbit x={0} feet={0} />
          </g>
          <Label x={150} text="용궁으로!" dark />
        </>,
      );
    case 7: // 용궁 위기
      return svg(
        <>
          <SeaBg palace />
          <King x={82} feet={150} />
          <path d="M98,116 l30,6" stroke="#2f7fa0" strokeWidth="6" strokeLinecap="round" />
          <Rabbit x={226} feet={150} flip />
          <text x="236" y="112" fontSize="16">😱</text>
          <Bubble x={140} y={58} w={132} text="네 간을 내놓아라!" color="#c0392b" />
          <Label x={82} text="용왕" dark />
          <Label x={230} text="토끼" dark />
        </>,
      );
    case 8: // 토끼의 꾀
      return svg(
        <>
          <SeaBg palace />
          <King x={82} feet={150} />
          <Rabbit x={224} feet={150} flip />
          <g>
            <rect x="150" y="150" width="26" height="18" rx="2" fill="#b98a4b" stroke="#7c5a2e" />
            <path d="M150,150 l13,-6 l13,6" fill="none" stroke="#7c5a2e" strokeWidth="2" />
            <text x="163" y="186" fontSize="9" fill="#fff" textAnchor="middle">간(비었어요)</text>
          </g>
          <Bubble x={140} y={56} w={140} text="간은 육지에 두고 왔어요!" color="#c0392b" />
          <Label x={82} text="용왕" dark />
          <Label x={230} text="토끼(꾀)" dark />
        </>,
      );
    case 9: // 탈출
      return svg(
        <>
          <defs>
            <linearGradient id="s10" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#ffe3bf" />
              <stop offset="1" stopColor="#e3f1e2" />
            </linearGradient>
          </defs>
          <rect width="320" height="120" fill="url(#s10)" />
          <circle cx="48" cy="38" r="17" fill="#ffcf6b" />
          <rect x="0" y="120" width="150" height="70" fill="#3f9fb0" />
          <path d="M120,120 q60,-14 200,-4 L320,190 L120,190 Z" fill="#8fb45f" />
          <g fill="#4f7a3f">
            <circle cx="252" cy="96" r="18" />
            <circle cx="280" cy="104" r="20" />
          </g>
          <Flower x={170} y={160} c="#e4572e" />
          <Flower x={300} y={164} c="#f2b705" />
          <Turtle x={58} feet={150} />
          <text x="26" y="126" fontSize="14" fill="#c0392b" fontWeight="700">!?</text>
          <g transform="rotate(-7 212 150)">
            <Rabbit x={212} feet={150} />
          </g>
          <path d="M188,120 l-14,2 M188,130 l-16,3" stroke="#fff" strokeWidth="2" opacity="0.8" strokeLinecap="round" />
          <Label x={56} text="자라" dark />
          <Label x={214} text="토끼(탈출!)" />
        </>,
      );
    default:
      return svg(<ForestBg />);
  }
}

interface Props {
  label?: string;
  className?: string;
}

export default function StorySynopsis({
  label = "📖 줄거리 보기",
  className = "btn story-btn big",
}: Props) {
  const [open, setOpen] = useState(false);
  const [idx, setIdx] = useState(0);

  const last = SCENES.length - 1;
  const scene = SCENES[idx];

  function close() {
    setOpen(false);
    setIdx(0);
  }

  return (
    <>
      <button className={className} onClick={() => setOpen(true)}>
        {label}
      </button>

      {open && (
        <div
          className="story-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) close();
          }}
        >
          <div className="story-modal" role="dialog" aria-modal="true">
            <div className="story-head">
              <span className="story-kicker">📖 그림으로 보는 『토끼전』 줄거리 (10장면)</span>
              <button className="lang-close-x" onClick={close} aria-label="닫기">
                ✕
              </button>
            </div>

            <div className="story-art">
              {SCENE_IMG[idx] ? (
                <img className="story-img" src={SCENE_IMG[idx]!} alt={scene.title} />
              ) : (
                <SceneArt index={idx} />
              )}
            </div>

            <div className="story-body">
              <h3>{scene.title}</h3>
              <p>{scene.text}</p>
              <div className="story-words">
                {scene.words.map(([k, v], i) => (
                  <span key={i} className="story-word">
                    <b>{k}</b> {v}
                  </span>
                ))}
              </div>
            </div>

            <div className="story-dots">
              {SCENES.map((_, i) => (
                <button
                  key={i}
                  className={`story-dot ${i === idx ? "on" : ""}`}
                  onClick={() => setIdx(i)}
                  aria-label={`${i + 1}번 장면`}
                />
              ))}
            </div>

            <div className="story-nav">
              <button
                className="btn ghost"
                onClick={() => setIdx((v) => Math.max(0, v - 1))}
                disabled={idx === 0}
              >
                ◀ 이전
              </button>
              <span className="story-count">
                {idx + 1} / {SCENES.length}
              </span>
              {idx < last ? (
                <button className="btn" onClick={() => setIdx((v) => v + 1)}>
                  다음 ▶
                </button>
              ) : (
                <a className="btn" href="/chat">
                  대화 시작하기 💬
                </a>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
