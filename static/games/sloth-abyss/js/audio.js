/* ===========================================================
   Sloth Abyss - audio.js
   WebAudio 合成音效 + 簡易環境音樂
   =========================================================== */
'use strict';

const Audio = {
  ctx: null, master: null, musicGain: null, sfxGain: null,
  enabled: true, started: false,
  lastPlay: {},

  init() {
    if (this.ctx) return;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = 1;
      this.master.connect(this.ctx.destination);
      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.value = Save.meta ? Save.meta.settings.sfx : 0.7;
      this.sfxGain.connect(this.master);
      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.value = Save.meta ? Save.meta.settings.music : 0.3;
      this.musicGain.connect(this.master);
    } catch (e) { this.enabled = false; }
  },
  resume() {
    this.init();
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
    if (!this.started) { this.started = true; this.startMusic(); }
  },
  setVol(sfx, music) {
    if (this.sfxGain) this.sfxGain.gain.value = sfx;
    if (this.musicGain) this.musicGain.gain.value = music;
  },

  tone(freq, dur, type, vol, slideTo, delay) {
    if (!this.ctx || !this.enabled) return;
    const t0 = this.ctx.currentTime + (delay || 0);
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type || 'sine';
    o.frequency.setValueAtTime(freq, t0);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t0 + dur);
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(vol === undefined ? 0.25 : vol, t0 + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g); g.connect(this.sfxGain);
    o.start(t0); o.stop(t0 + dur + 0.02);
  },
  noise(dur, vol, filterFreq, sweep) {
    if (!this.ctx || !this.enabled) return;
    const t0 = this.ctx.currentTime;
    const len = Math.floor(this.ctx.sampleRate * dur);
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = this.ctx.createBufferSource(); src.buffer = buf;
    const f = this.ctx.createBiquadFilter();
    f.type = 'lowpass'; f.frequency.setValueAtTime(filterFreq || 1200, t0);
    if (sweep) f.frequency.exponentialRampToValueAtTime(Math.max(60, sweep), t0 + dur);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(vol === undefined ? 0.25 : vol, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(f); f.connect(g); g.connect(this.sfxGain);
    src.start(t0);
  },

  play(name) {
    if (!this.ctx || !this.enabled) return;
    // 節流：同音效 30ms 內只放一次
    const now = this.ctx.currentTime;
    if (this.lastPlay[name] && now - this.lastPlay[name] < 0.035) return;
    this.lastPlay[name] = now;
    switch (name) {
      case 'swing': this.noise(0.13, 0.16, 2400, 400); break;
      case 'hit': this.tone(180, 0.09, 'square', 0.14, 90); this.noise(0.06, 0.12, 1800); break;
      case 'crit': this.tone(420, 0.14, 'square', 0.2, 140); this.noise(0.09, 0.16, 3000, 500); break;
      case 'shoot': this.tone(660, 0.12, 'triangle', 0.13, 330); break;
      case 'enemyShoot': this.tone(300, 0.14, 'sawtooth', 0.09, 160); break;
      case 'cast': this.tone(320, 0.28, 'sine', 0.16, 880); break;
      case 'nova': this.tone(520, 0.4, 'sine', 0.2, 180); this.noise(0.3, 0.14, 2000, 300); break;
      case 'frost': this.tone(900, 0.35, 'sine', 0.16, 300); this.noise(0.25, 0.1, 5000, 800); break;
      case 'zap': this.tone(1400, 0.16, 'square', 0.12, 400); this.noise(0.12, 0.12, 6000, 1000); break;
      case 'whirl': this.tone(220, 0.5, 'sawtooth', 0.12, 320); break;
      case 'dash': this.noise(0.18, 0.18, 3000, 300); break;
      case 'summon': this.tone(240, 0.3, 'sine', 0.16, 620); this.tone(360, 0.3, 'sine', 0.1, 720, 0.05); break;
      case 'explode': this.noise(0.5, 0.32, 900, 60); this.tone(90, 0.4, 'sine', 0.22, 40); break;
      case 'hurt': this.tone(150, 0.22, 'sawtooth', 0.22, 70); break;
      case 'die': this.tone(200, 0.7, 'sawtooth', 0.25, 50); this.noise(0.6, 0.2, 800, 60); break;
      case 'levelup':
        [523, 659, 784, 1046].forEach((f, i) => this.tone(f, 0.32, 'triangle', 0.18, null, i * 0.08));
        break;
      case 'pickup': this.tone(880, 0.09, 'triangle', 0.11, 1200); break;
      case 'coin': this.tone(1200, 0.07, 'square', 0.08, 1600); break;
      case 'potion': this.tone(400, 0.2, 'sine', 0.16, 900); break;
      case 'stairs': [400, 500, 600].forEach((f, i) => this.tone(f, 0.3, 'sine', 0.14, null, i * 0.1)); break;
      case 'shrine': [660, 880, 1100].forEach((f, i) => this.tone(f, 0.5, 'sine', 0.13, null, i * 0.12)); break;
      case 'chest': this.tone(300, 0.12, 'square', 0.14, 500); this.tone(700, 0.3, 'triangle', 0.12, 900, 0.1); break;
      case 'boss': this.tone(70, 1.4, 'sawtooth', 0.3, 40); this.noise(1.2, 0.2, 500, 60); break;
      case 'ui': this.tone(700, 0.05, 'square', 0.07); break;
      case 'charge': this.tone(120, 0.3, 'sawtooth', 0.16, 260); break;
      case 'legendary': [660, 880, 1320, 1760].forEach((f, i) => this.tone(f, 0.6, 'triangle', 0.16, null, i * 0.1)); break;
    }
  },

  /* --- 環境音樂：緩慢的和弦墊 + 隨機音符 --- */
  musicTimer: null, musicStep: 0, musicScale: [0, 3, 5, 7, 10],
  startMusic() {
    if (!this.ctx) return;
    const root = 110;
    const loop = () => {
      if (!this.ctx) return;
      const t = this.ctx.currentTime;
      const step = this.musicStep++;
      // 低頻墊音
      if (step % 8 === 0) {
        const o = this.ctx.createOscillator(), g = this.ctx.createGain();
        o.type = 'sawtooth';
        const f = root * (step % 16 === 0 ? 1 : 1.335);
        o.frequency.value = f;
        const filt = this.ctx.createBiquadFilter();
        filt.type = 'lowpass'; filt.frequency.value = 420;
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(0.14, t + 1.2);
        g.gain.linearRampToValueAtTime(0.0001, t + 4.2);
        o.connect(filt); filt.connect(g); g.connect(this.musicGain);
        o.start(t); o.stop(t + 4.4);
      }
      // 零星旋律
      if (Math.random() < 0.4) {
        const n = this.musicScale[Math.floor(Math.random() * this.musicScale.length)];
        const oct = Math.random() < 0.5 ? 4 : 8;
        const f = root * oct * Math.pow(2, n / 12);
        const o = this.ctx.createOscillator(), g = this.ctx.createGain();
        o.type = 'triangle'; o.frequency.value = f;
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(0.05, t + 0.05);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 1.6);
        o.connect(g); g.connect(this.musicGain);
        o.start(t); o.stop(t + 1.7);
      }
      this.musicTimer = setTimeout(loop, 700);
    };
    loop();
  }
};
