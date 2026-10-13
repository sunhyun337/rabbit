/**
 * 게임 사운드 — Web Audio API로 합성하는 신나는 5음계(펜타토닉) 배경음악 + 효과음.
 * 외부 음원/파일 없이 브라우저에서 생성하므로 저작권·용량 부담이 없다.
 * 밝고 경쾌한 행진곡 느낌(빠른 템포 + 몰아치는 베이스 + 킥/하이햇 리듬).
 *
 * 사용: const m = new GameMusic(); m.start();  // 사용자 제스처(출발 클릭) 이후
 *       m.sfxJump(); m.sfxSplash();            // 효과음
 *       m.setMuted(true); m.stop();
 */

// C 장조 펜타토닉 음 주파수(Hz) — 멜로디
const C4 = 261.63;
const D4 = 293.66;
const E4 = 329.63;
const G4 = 392.0;
const A4 = 440.0;
const C5 = 523.25;
const D5 = 587.33;
const E5 = 659.25;
const SCALE = [C4, D4, E4, G4, A4, C5, D5, E5];

// 베이스 음(낮은 옥타브)
const C3 = 130.81;
const G2 = 98.0;
const A2 = 110.0;

// 멜로디: 8분음표 32스텝(4마디). 숫자는 SCALE 인덱스, null은 쉼/지속.
// 음이 자주 움직이는 경쾌한 라인.
const MELODY: (number | null)[] = [
  5, null, 3, 4, 5, null, 4, 3, // 도' 솔 라 도' 라 솔
  2, 3, 4, null, 3, 2, 1, null, // 미 솔 라 솔 미 레
  3, 4, 5, 6, 7, null, 6, 5, // 솔 라 도' 레' 미' 레' 도'
  4, null, 3, null, 2, null, null, null, // 라 솔 미
];
// 마디별 베이스 근음(4마디): 도 - 라 - 솔 - 도
const BASS = [C3, A2, G2, C3];

export class GameMusic {
  private ctx: AudioContext | null = null;
  private music: GainNode | null = null; // 배경음악 버스
  private sfx: GainNode | null = null; // 효과음 버스
  private timer: ReturnType<typeof setInterval> | null = null;
  private nextTime = 0;
  private step = 0;
  private muted = false;
  private readonly bpm = 138; // 신나는 빠른 템포
  private readonly musicVol = 0.15;
  private readonly sfxVol = 0.32;

  private ensureContext() {
    if (typeof window === "undefined") return;
    if (this.ctx) return;
    const AC: typeof AudioContext =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.music = this.ctx.createGain();
    this.music.gain.value = this.muted ? 0 : this.musicVol;
    this.music.connect(this.ctx.destination);
    this.sfx = this.ctx.createGain();
    this.sfx.gain.value = this.muted ? 0 : this.sfxVol;
    this.sfx.connect(this.ctx.destination);
  }

  /** 음악 시작(사용자 제스처 이후에 호출해야 자동재생 정책 통과) */
  start() {
    this.ensureContext();
    if (!this.ctx) return;
    void this.ctx.resume?.();
    if (this.timer != null) return; // 이미 재생 중
    this.step = 0;
    this.nextTime = this.ctx.currentTime + 0.08;
    this.timer = setInterval(() => this.scheduler(), 25);
  }

  /** 음악 정지(스케줄러만 멈춘다; 컨텍스트는 재사용 → 효과음은 계속 가능) */
  stop() {
    if (this.timer != null) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  setMuted(m: boolean) {
    this.muted = m;
    if (this.ctx) {
      this.music?.gain.setTargetAtTime(
        m ? 0 : this.musicVol,
        this.ctx.currentTime,
        0.05,
      );
      this.sfx?.gain.setTargetAtTime(
        m ? 0 : this.sfxVol,
        this.ctx.currentTime,
        0.02,
      );
    }
  }

  isMuted() {
    return this.muted;
  }

  dispose() {
    this.stop();
    void this.ctx?.close?.();
    this.ctx = null;
    this.music = null;
    this.sfx = null;
  }

  // ===== 효과음 =====

  /** 점프 — 짧게 위로 솟는 "뾰잉" */
  sfxJump() {
    this.ensureContext();
    const ctx = this.ctx;
    if (!ctx || !this.sfx) return;
    const t = ctx.currentTime;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = "square";
    o.frequency.setValueAtTime(300, t);
    o.frequency.exponentialRampToValueAtTime(780, t + 0.12);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.5, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0008, t + 0.16);
    o.connect(g);
    g.connect(this.sfx);
    o.start(t);
    o.stop(t + 0.18);
  }

  /** 첨벙 — 웅덩이/물에 빠질 때. big=true면 더 크게(풍덩). */
  sfxSplash(big = false) {
    this.ensureContext();
    const ctx = this.ctx;
    if (!ctx || !this.sfx) return;
    const t = ctx.currentTime;
    const dur = big ? 0.5 : 0.32;
    // 1) 점점 작아지는 노이즈(물보라)
    const buf = ctx.createBuffer(
      1,
      Math.max(1, Math.ceil(ctx.sampleRate * dur)),
      ctx.sampleRate,
    );
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) {
      d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
    }
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.setValueAtTime(big ? 1500 : 1050, t);
    lp.frequency.exponentialRampToValueAtTime(300, t + dur);
    const ng = ctx.createGain();
    ng.gain.setValueAtTime(big ? 0.6 : 0.42, t);
    ng.gain.exponentialRampToValueAtTime(0.0008, t + dur);
    src.connect(lp);
    lp.connect(ng);
    ng.connect(this.sfx);
    src.start(t);
    src.stop(t + dur);
    // 2) 아래로 떨어지는 "플롭" 음정
    const o = ctx.createOscillator();
    const og = ctx.createGain();
    o.type = "sine";
    o.frequency.setValueAtTime(big ? 520 : 440, t);
    o.frequency.exponentialRampToValueAtTime(150, t + (big ? 0.24 : 0.18));
    og.gain.setValueAtTime(big ? 0.4 : 0.3, t);
    og.gain.exponentialRampToValueAtTime(0.0008, t + (big ? 0.26 : 0.2));
    o.connect(og);
    og.connect(this.sfx);
    o.start(t);
    o.stop(t + (big ? 0.28 : 0.22));
  }

  // ===== 배경음악 =====

  // 룩어헤드 스케줄러: 다음 0.1초 구간의 음을 미리 예약
  private scheduler() {
    const ctx = this.ctx;
    if (!ctx) return;
    const stepDur = 60 / this.bpm / 2; // 8분음표 길이
    while (this.nextTime < ctx.currentTime + 0.1) {
      this.playStep(this.step, this.nextTime, stepDur);
      this.nextTime += stepDur;
      this.step = (this.step + 1) % MELODY.length;
    }
  }

  private playStep(step: number, time: number, stepDur: number) {
    // 멜로디
    const m = MELODY[step];
    if (m != null) {
      this.note(SCALE[m], time, stepDur * 1.8, "triangle", 0.5);
      this.note(SCALE[m] * 2, time, stepDur * 1.1, "sine", 0.1); // 옥타브 배음
    }
    const inBar = step % 8;
    // 베이스 — 매 박(2스텝)마다 몰아치듯, 근음↔옥타브 바운스
    if (step % 2 === 0) {
      const bar = Math.floor(step / 8) % BASS.length;
      const root = BASS[bar];
      const f = inBar % 4 === 0 ? root : root * 2; // 쿵-딱 바운스
      this.note(f, time, stepDur * 1.2, "sine", 0.6);
    }
    // 킥(낮은 쿵) — 각 마디 1·3박
    if (inBar === 0 || inBar === 4) this.kick(time);
    // 하이햇(치- 치-) — 엇박마다, 신나는 드라이브
    if (step % 2 === 1) this.hat(time, 0.6);
    else if (inBar === 2 || inBar === 6) this.hat(time, 0.9);
  }

  private note(
    freq: number,
    time: number,
    dur: number,
    type: OscillatorType,
    vel: number,
  ) {
    const ctx = this.ctx;
    if (!ctx || !this.music) return;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, time);
    g.gain.linearRampToValueAtTime(vel, time + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0008, time + dur);
    o.connect(g);
    g.connect(this.music);
    o.start(time);
    o.stop(time + dur + 0.03);
  }

  private kick(time: number) {
    const ctx = this.ctx;
    if (!ctx || !this.music) return;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = "sine";
    o.frequency.setValueAtTime(150, time);
    o.frequency.exponentialRampToValueAtTime(48, time + 0.12);
    g.gain.setValueAtTime(0.9, time);
    g.gain.exponentialRampToValueAtTime(0.0008, time + 0.16);
    o.connect(g);
    g.connect(this.music);
    o.start(time);
    o.stop(time + 0.18);
  }

  private hat(time: number, vel: number) {
    const ctx = this.ctx;
    if (!ctx || !this.music) return;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = "square";
    o.frequency.setValueAtTime(5200, time);
    g.gain.setValueAtTime(0.05 * vel, time);
    g.gain.exponentialRampToValueAtTime(0.0006, time + 0.04);
    o.connect(g);
    g.connect(this.music);
    o.start(time);
    o.stop(time + 0.05);
  }
}
