"use client";

import { useRef, useState } from "react";
import { WORLD_TALES } from "@/lib/story/worldTales";

export default function WorldTales() {
  const [selected, setSelected] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [ttsBusy, setTtsBusy] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const tale = WORLD_TALES.find((t) => t.id === selected);

  function stopAudio() {
    audioRef.current?.pause();
    audioRef.current = null;
    setPlaying(false);
  }

  function select(id: string) {
    stopAudio();
    setSelected(id);
  }

  async function listen() {
    if (!tale) return;
    if (playing) {
      stopAudio();
      return;
    }
    const text = `${tale.title}. ${tale.body.join(" ")} ${tale.lesson}`;
    setTtsBusy(true);
    try {
      const res = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      if (!res.ok) throw new Error("tts");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audioRef.current = audio;
      audio.onended = () => {
        URL.revokeObjectURL(url);
        setPlaying(false);
      };
      await audio.play();
      setPlaying(true);
    } catch {
      alert("음성을 재생하지 못했어요. 잠시 후 다시 시도해 주세요.");
    } finally {
      setTtsBusy(false);
    }
  }

  return (
    <div className="world-wrap">
      <header className="world-header">
        <a href="/" className="chat-back">
          ← 홈
        </a>
        <span className="chat-title">🌍 다른 나라 이야기</span>
      </header>

      <p className="world-lead">
        세계 여러 나라의 <b>지혜나 꾀에 대한 이야기</b>예요. 나라를 골라 읽거나 들어보세요.
      </p>

      <div className="world-grid">
        {WORLD_TALES.map((t) => (
          <button
            key={t.id}
            className={`world-country ${selected === t.id ? "active" : ""}`}
            onClick={() => select(t.id)}
          >
            <span className="world-flag">{t.flag}</span>
            <span className="world-name">{t.country}</span>
          </button>
        ))}
      </div>

      {tale && (
        <article className="world-tale">
          <div className="world-tale-top">
            <h2>
              {tale.flag} {tale.title}
            </h2>
            <button
              className="world-listen"
              onClick={listen}
              disabled={ttsBusy}
            >
              {ttsBusy ? "준비 중…" : playing ? "⏹ 멈춤" : "🔊 듣기"}
            </button>
          </div>
          <p className="world-tale-country">{tale.country} 이야기</p>
          {tale.body.map((p, i) => (
            <p key={i} className="world-para">
              {p}
            </p>
          ))}
          <p className="world-lesson">💡 {tale.lesson}</p>
        </article>
      )}

    </div>
  );
}
