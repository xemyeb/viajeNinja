'use strict';
// ============================================================
//  Sonido: efectos y música sintetizados con WebAudio
//  (no hace falta ningún archivo de audio)
// ============================================================
const SONGS = {
  title: {
    beat: 0.15, wave: 'square',
    melody: [72, 0, 76, 0, 79, 0, 84, 0, 83, 0, 79, 0, 76, 0, 79, 0, 81, 0, 77, 0, 74, 0, 77, 0, 79, 0, 76, 0, 72, 0, 0, 0],
    bass:   [48, 0, 55, 0, 48, 0, 55, 0, 52, 0, 55, 0, 52, 0, 55, 0, 53, 0, 57, 0, 53, 0, 57, 0, 55, 0, 50, 0, 43, 0, 47, 0],
  },
  city: {
    beat: 0.14, wave: 'square',
    melody: [72, 0, 76, 0, 79, 0, 76, 0, 77, 0, 74, 0, 71, 0, 74, 0, 72, 0, 76, 0, 79, 0, 84, 0, 83, 0, 79, 0, 74, 0, 0, 0],
    bass:   [48, 0, 55, 0, 48, 0, 55, 0, 50, 0, 57, 0, 43, 0, 50, 0, 48, 0, 55, 0, 48, 0, 55, 0, 43, 0, 50, 0, 43, 0, 47, 0],
  },
  forest: {
    beat: 0.16, wave: 'triangle',
    melody: [69, 0, 72, 76, 74, 0, 72, 0, 71, 0, 74, 0, 72, 71, 69, 0, 69, 0, 72, 76, 79, 0, 77, 76, 74, 0, 72, 0, 71, 0, 0, 0],
    bass:   [45, 0, 52, 0, 45, 0, 52, 0, 43, 0, 50, 0, 43, 0, 50, 0, 41, 0, 48, 0, 41, 0, 48, 0, 40, 0, 47, 0, 40, 0, 47, 0],
  },
  castle: {
    beat: 0.17, wave: 'square',
    melody: [62, 0, 62, 65, 69, 0, 67, 65, 64, 0, 64, 67, 70, 0, 69, 67, 65, 0, 69, 0, 74, 0, 72, 70, 69, 0, 67, 0, 65, 0, 64, 0],
    bass:   [38, 0, 45, 0, 38, 0, 45, 0, 36, 0, 43, 0, 36, 0, 43, 0, 34, 0, 41, 0, 34, 0, 41, 0, 33, 0, 40, 0, 33, 0, 40, 0],
  },
  beach: {
    beat: 0.15, wave: 'triangle',
    melody: [67, 0, 71, 74, 76, 0, 74, 71, 72, 0, 76, 0, 74, 0, 71, 0, 67, 0, 71, 74, 79, 0, 76, 74, 72, 0, 71, 0, 67, 0, 0, 0],
    bass:   [43, 0, 50, 0, 43, 0, 50, 0, 48, 0, 55, 0, 48, 0, 55, 0, 43, 0, 50, 0, 43, 0, 50, 0, 50, 0, 57, 0, 43, 0, 50, 0],
  },
  ice: {
    beat: 0.18, wave: 'sine',
    melody: [76, 0, 79, 0, 83, 0, 84, 83, 79, 0, 76, 0, 74, 0, 0, 0, 72, 0, 76, 0, 79, 0, 81, 79, 76, 0, 74, 0, 71, 0, 0, 0],
    bass:   [45, 0, 52, 0, 57, 0, 52, 0, 41, 0, 48, 0, 53, 0, 48, 0, 43, 0, 50, 0, 55, 0, 50, 0, 40, 0, 47, 0, 52, 0, 47, 0],
  },
  volcano: {
    beat: 0.13, wave: 'square',
    melody: [62, 0, 65, 62, 69, 0, 68, 0, 67, 0, 65, 0, 62, 0, 0, 0, 62, 0, 65, 62, 70, 0, 69, 0, 68, 0, 67, 0, 65, 0, 64, 0],
    bass:   [38, 38, 0, 38, 41, 0, 38, 0, 37, 37, 0, 37, 40, 0, 37, 0, 38, 38, 0, 38, 43, 0, 41, 0, 40, 0, 40, 0, 37, 0, 37, 0],
  },
  ending: {
    beat: 0.16, wave: 'triangle',
    melody: [72, 0, 76, 0, 79, 0, 84, 0, 81, 0, 79, 0, 76, 0, 79, 0, 77, 0, 81, 0, 84, 0, 88, 0, 86, 0, 84, 0, 83, 0, 84, 0],
    bass:   [48, 0, 55, 0, 52, 0, 55, 0, 53, 0, 57, 0, 48, 0, 55, 0, 53, 0, 57, 0, 52, 0, 55, 0, 50, 0, 55, 0, 43, 0, 48, 0],
  },
  boss: {
    beat: 0.12, wave: 'sawtooth',
    melody: [64, 63, 64, 0, 67, 0, 64, 0, 62, 61, 62, 0, 65, 0, 62, 0, 64, 63, 64, 0, 69, 0, 67, 0, 66, 0, 67, 0, 71, 0, 0, 0],
    bass:   [40, 40, 0, 40, 40, 0, 40, 0, 38, 38, 0, 38, 38, 0, 38, 0, 40, 40, 0, 40, 45, 0, 43, 0, 42, 0, 43, 0, 47, 0, 47, 0],
  },
};

const Sound = {
  ctx: null,
  master: null,
  muted: false,
  song: null,
  wantSong: null,
  timer: null,
  step: 0,
  nextTime: 0,

  init() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      try {
        this.ctx = new AC();
        this.master = this.ctx.createGain();
        this.master.gain.value = this.muted ? 0 : 0.5;
        this.master.connect(this.ctx.destination);
      } catch (e) { this.ctx = null; return; }
      if (this.wantSong) this.playMusic(this.wantSong);
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
  },

  toggleMute() {
    this.muted = !this.muted;
    if (this.master) this.master.gain.value = this.muted ? 0 : 0.5;
  },

  tone(freq, dur, type = 'square', vol = 0.12, freqEnd = null, delay = 0) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime + Math.max(0, delay);
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (freqEnd) o.frequency.exponentialRampToValueAtTime(freqEnd, t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
    o.connect(g); g.connect(this.master);
    o.start(t); o.stop(t + dur + 0.03);
  },

  noise(dur, vol = 0.15, filterFreq = 1800, delay = 0) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime + delay;
    const len = Math.max(1, Math.floor(this.ctx.sampleRate * dur));
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const f = this.ctx.createBiquadFilter();
    f.type = 'lowpass'; f.frequency.value = filterFreq;
    const g = this.ctx.createGain();
    g.gain.value = vol;
    src.connect(f); f.connect(g); g.connect(this.master);
    src.start(t);
  },

  play(name) {
    if (!this.ctx) return;
    switch (name) {
      case 'jump': this.tone(330, 0.12, 'square', 0.08, 660); break;
      case 'djump': this.tone(520, 0.14, 'square', 0.08, 1040); break;
      case 'coin': this.tone(988, 0.07, 'square', 0.07); this.tone(1319, 0.16, 'square', 0.07, null, 0.07); break;
      case 'heart': this.tone(660, 0.1, 'triangle', 0.12); this.tone(880, 0.18, 'triangle', 0.12, null, 0.09); break;
      case 'swing': this.noise(0.09, 0.12, 3000); break;
      case 'throw': this.tone(900, 0.09, 'triangle', 0.1, 450); break;
      case 'hit': this.tone(220, 0.1, 'sawtooth', 0.1, 90); break;
      case 'pop': this.tone(500, 0.12, 'square', 0.1, 120); this.noise(0.1, 0.08); break;
      case 'stomp': this.tone(260, 0.14, 'square', 0.12, 70); break;
      case 'clank': this.tone(1200, 0.08, 'square', 0.08, 700); this.tone(900, 0.12, 'triangle', 0.08, null, 0.04); break;
      case 'hurt': this.tone(420, 0.28, 'sawtooth', 0.12, 110); break;
      case 'die': [523, 392, 330, 262, 196].forEach((f, i) => this.tone(f, 0.2, 'square', 0.1, null, i * 0.15)); break;
      case 'power': [523, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.13, 'square', 0.08, null, i * 0.08)); break;
      case 'checkpoint': [784, 988, 1175].forEach((f, i) => this.tone(f, 0.12, 'triangle', 0.12, null, i * 0.07)); break;
      case 'tick': this.tone(700, 0.05, 'square', 0.06); break;
      case 'fire': this.noise(0.25, 0.1, 900); break;
      case 'ice': this.tone(1500, 0.18, 'triangle', 0.06, 2400); break;
      case 'thud': this.tone(90, 0.3, 'sine', 0.3, 40); this.noise(0.2, 0.15, 400); break;
      case 'boss': this.tone(110, 0.8, 'sawtooth', 0.12, 55); this.tone(82, 0.8, 'square', 0.08, 41, 0.1); break;
      case 'bosshit': this.tone(160, 0.12, 'square', 0.14, 80); break;
      case 'bossdie': for (let i = 0; i < 8; i++) this.noise(0.25, 0.18, 600, i * 0.12); break;
      case 'portal': this.tone(200, 1.0, 'sine', 0.15, 1600); this.tone(300, 1.0, 'triangle', 0.08, 2000, 0.1); break;
      case 'win': [523, 659, 784, 1047, 784, 1047].forEach((f, i) => this.tone(f, 0.18, 'square', 0.09, null, i * 0.12)); break;
      case 'victory': [523, 523, 523, 659, 784, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.22, 'square', 0.09, null, i * 0.16)); break;
    }
  },

  // ---- Música ----
  playMusic(name) {
    this.wantSong = name;
    if (!this.ctx) return;
    if (this.song === SONGS[name] && this.timer) return;
    this.stopMusic();
    this.wantSong = name;
    this.song = SONGS[name];
    this.step = 0;
    this.nextTime = this.ctx.currentTime + 0.1;
    this.timer = setInterval(() => this.schedule(), 40);
  },
  stopMusic() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    this.song = null;
    this.wantSong = null;
  },
  schedule() {
    if (!this.ctx || !this.song) return;
    const s = this.song;
    while (this.nextTime < this.ctx.currentTime + 0.2) {
      const i = this.step % s.melody.length;
      const delay = this.nextTime - this.ctx.currentTime;
      const m = s.melody[i], b = s.bass[i];
      if (m) this.tone(midi(m), s.beat * 0.9, s.wave, 0.03, null, delay);
      if (b) this.tone(midi(b), s.beat * 1.6, 'triangle', 0.07, null, delay);
      this.nextTime += s.beat;
      this.step++;
    }
  },
};

function midi(n) { return 440 * Math.pow(2, (n - 69) / 12); }
