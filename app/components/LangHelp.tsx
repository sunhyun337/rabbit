"use client";

import { useState } from "react";

/**
 * 상단 언어 마크 바 — 영어/베트남어/몽골어/미얀마어를 클릭하면
 * 해당 모국어로 앱 사용법 도움말을 보여준다.
 * (UI 기본 언어는 한국어. 번역은 AI 생성이라 원어민 검수 권장.)
 */

interface Help {
  heading: string;
  intro: string;
  steps: string[];
  tip: string;
  glossaryLabel: string;
  glossary: [string, string][]; // [한국어, 번역]
  close: string;
}

interface Lang {
  code: string;
  flag: string;
  label: string;
  help: Help;
}

const LANGS: Lang[] = [
  {
    code: "en",
    flag: "🇬🇧",
    label: "English",
    help: {
      heading: "Help · How to use",
      intro:
        "This app helps you practice speaking Korean with the classic tale “Tokkijeon” (The Rabbit and the Turtle), for TOPIK level-4 learners.",
      steps: [
        "Tap “대화 시작하기” to talk with the AI tutor. You can type, or tap “🎤 말하기” to speak.",
        "Read the 5 key scenes on the left to follow the story.",
        "Play the 게임 (Game): walk ← → and jump ↑ / Space through forest → sea palace → forest, racing the turtle. Answer the 토끼전 questions — correct = you speed up; wrong = the turtle speeds up, a close race!",
      ],
      tip: "The tutor helps you think by asking questions — it won’t give the answer first. You may answer in simple Korean.",
      glossaryLabel: "Useful words",
      glossary: [
        ["대화", "conversation"],
        ["말하기", "speak"],
        ["전송", "send"],
        ["게임", "game"],
        ["장면", "scene"],
      ],
      close: "Close",
    },
  },
  {
    code: "vi",
    flag: "🇻🇳",
    label: "Tiếng Việt",
    help: {
      heading: "Trợ giúp · Cách sử dụng",
      intro:
        "Ứng dụng giúp bạn luyện nói tiếng Hàn qua truyện cổ tích “Tokkijeon” (Truyện Thỏ và Rùa), dành cho người học TOPIK cấp 4.",
      steps: [
        "Nhấn “대화 시작하기” để trò chuyện với gia sư AI. Bạn có thể gõ chữ, hoặc nhấn “🎤 말하기” để nói.",
        "Đọc 5 cảnh chính ở bên trái để hiểu câu chuyện.",
        "Chơi 게임 (Trò chơi): đi ← → và nhảy ↑ / Space qua rừng → long cung → rừng, đua với rùa. Trả lời câu hỏi 토끼전 — đúng = bạn tăng tốc; sai = rùa tăng tốc, cuộc đua gay cấn!",
      ],
      tip: "Gia sư giúp bạn suy nghĩ bằng câu hỏi — sẽ không đưa đáp án trước. Bạn có thể trả lời bằng tiếng Hàn đơn giản.",
      glossaryLabel: "Từ hữu ích",
      glossary: [
        ["대화", "cuộc trò chuyện"],
        ["말하기", "nói"],
        ["전송", "gửi"],
        ["게임", "trò chơi"],
        ["장면", "cảnh"],
      ],
      close: "Đóng",
    },
  },
  {
    code: "mn",
    flag: "🇲🇳",
    label: "Монгол",
    help: {
      heading: "Тусламж · Хэрхэн ашиглах",
      intro:
        "Энэ апп нь TOPIK 4-р түвшний суралцагчдад зориулан солонгосын сонгодог “Токкижон” (Туулай ба Яст мэлхийн үлгэр)-оор солонгосоор ярих дадлага хийхэд тусална.",
      steps: [
        "AI багштай ярилцахын тулд “대화 시작하기” дээр дарна. Та бичих, эсвэл “🎤 말하기” дээр дарж ярьж болно.",
        "Түүхийг ойлгохын тулд зүүн талын 5 гол дүр зургийг уншина уу.",
        "게임 (тоглоом) тогло: ← → алхаж, ↑ / Space үсэрч, ой → лусын ордон → ой дамжин яст мэлхийтэй уралд. 토끼전 асуултанд хариул — зөв бол чи хурдасна; буруу бол яст мэлхий хурдасна, тэнцүү уралдаан!",
      ],
      tip: "Багш асуулт асууж бодоход тусална — хариултыг эхэлж хэлэхгүй. Та энгийн солонгосоор хариулж болно.",
      glossaryLabel: "Хэрэгтэй үгс",
      glossary: [
        ["대화", "яриа"],
        ["말하기", "ярих"],
        ["전송", "илгээх"],
        ["게임", "тоглоом"],
        ["장면", "дүр зураг"],
      ],
      close: "Хаах",
    },
  },
  {
    code: "my",
    flag: "🇲🇲",
    label: "မြန်မာ",
    help: {
      heading: "အကူအညီ · အသုံးပြုနည်း",
      intro:
        "ဤအက်ပ်သည် TOPIK အဆင့် ၄ သင်ယူသူများအတွက် ကိုရီးယားရိုးရာပုံပြင် “Tokkijeon” (ယုန်နှင့်လိပ် ပုံပြင်) ဖြင့် ကိုရီးယားစကားပြော လေ့ကျင့်ရန် ကူညီပေးသည်။",
      steps: [
        "AI ဆရာနှင့် စကားပြောရန် “대화 시작하기” ကို နှိပ်ပါ။ စာရိုက်နိုင်သည်၊ သို့မဟုတ် “🎤 말하기” ကို နှိပ်၍ ပြောနိုင်သည်။",
        "ပုံပြင်ကို နားလည်ရန် ဘယ်ဘက်ရှိ အဓိကမြင်ကွင်း ၅ ခုကို ဖတ်ပါ။",
        "게임 (ဂိမ်း) ကစားပါ— ← → လမ်းလျှောက်၊ ↑ / Space ခုန်၍ တော → ရေအောက်နန်းတော် → တော ဖြတ်ကာ လိပ်နှင့် အပြိုင်ပြေးပါ။ 토끼전 မေးခွန်းဖြေပါ— မှန်လျှင် သင် အရှိန်တက်သည်၊ မှားလျှင် လိပ် အရှိန်တက်သည်၊ သိပ်စိတ်လှုပ်ရှားဖွယ်!",
      ],
      tip: "ဆရာသည် မေးခွန်းများဖြင့် သင့်ကို တွေးတောစေသည် — အဖြေကို အရင်မပြောပါ။ ရိုးရှင်းသော ကိုရီးယားဘာသာဖြင့် ဖြေနိုင်သည်။",
      glossaryLabel: "အသုံးဝင်သောစကားလုံးများ",
      glossary: [
        ["대화", "စကားပြော"],
        ["말하기", "ပြောဆိုခြင်း"],
        ["전송", "ပို့ရန်"],
        ["게임", "ဂိမ်း"],
        ["장면", "မြင်ကွင်း"],
      ],
      close: "ပိတ်ရန်",
    },
  },
];

export default function LangHelp() {
  const [open, setOpen] = useState<Lang | null>(null);

  return (
    <div className="langbar">
      <span className="langbar-label">🌏 도움말</span>
      <div className="langbar-marks">
        {LANGS.map((l) => (
          <button
            key={l.code}
            className="lang-mark"
            onClick={() => setOpen(l)}
            title={`${l.label} — ${l.help.heading}`}
          >
            <span className="lang-flag">{l.flag}</span>
            <span className="lang-name">{l.label}</span>
          </button>
        ))}
      </div>

      {open && (
        <div
          className="lang-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) setOpen(null);
          }}
        >
          <div className="lang-modal" role="dialog" aria-modal="true">
            <div className="lang-modal-head">
              <span className="lang-modal-flag">{open.flag}</span>
              <h3>{open.help.heading}</h3>
              <button
                className="lang-close-x"
                onClick={() => setOpen(null)}
                aria-label={open.help.close}
              >
                ✕
              </button>
            </div>

            <p className="lang-intro">{open.help.intro}</p>

            <ol className="lang-steps">
              {open.help.steps.map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ol>

            <p className="lang-tip">💡 {open.help.tip}</p>

            <div className="lang-glossary">
              <span className="lang-glossary-label">{open.help.glossaryLabel}</span>
              <ul>
                {open.help.glossary.map(([kr, tr], i) => (
                  <li key={i}>
                    <b>{kr}</b>
                    <span>{tr}</span>
                  </li>
                ))}
              </ul>
            </div>

            <button className="btn" onClick={() => setOpen(null)}>
              {open.help.close}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
